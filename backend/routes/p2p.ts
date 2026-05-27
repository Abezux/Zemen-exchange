/**
 * P2P Trading System with Atomic Consistency and Escrow Safety
 */

import express, { Response } from "express";
import { AuthRequest, authenticate, checkNotFrozen } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";
import multer from "multer";
import { uploadToCloudinary } from "../lib/cloudinary.ts";
import { sendNotification } from "../lib/notification.ts";
import jwt from "jsonwebtoken";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG, PNG and WEBP images are allowed') as any, false);
      }
    }
});

// Helper to log actions
async function logAction(userId: string, action: string, details?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : null
      }
    });
  } catch (err) {
    console.error("Failed to log action:", err);
  }
}

/**
 * 1. Merchant Application (Standard Check)
 */
router.post("/merchant/apply", authenticate, async (req: AuthRequest, res: Response) => {
  const { phoneNumber, bio } = req.body;
  if (!req.user?.id) return res.status(401).json({ error: "Auth missing" });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const finalBusinessName = user.name || user.email.split("@")[0];

    // Ensure status is always PENDING initially
    const existingMerchant = await prisma.merchant.findUnique({ where: { userId: req.user.id } });
    if (existingMerchant) {
      if (existingMerchant.status === "PENDING") return res.status(400).json({ error: "Pending application exists." });
      if (existingMerchant.status === "APPROVED") return res.status(400).json({ error: "Already approved." });

      const updated = await prisma.merchant.update({
        where: { id: existingMerchant.id },
        data: { businessName: finalBusinessName, phoneNumber, bio: bio || "", status: "PENDING" }
      });
      return res.json(updated);
    }

    const merchant = await prisma.merchant.create({
      data: { userId: req.user.id, businessName: finalBusinessName, phoneNumber, bio: bio || "", status: "PENDING" }
    });
    res.json(merchant);
  } catch (error) {
    res.status(500).json({ error: "Application failed" });
  }
});

/**
 * 2. Marketplace & Liquidity Retrieval (with Advanced Prefiltering & Multi-tier Ranking)
 */
async function getFilteredAndRankedAds(filters: any, currentUserId?: string) {
  const { 
    type, 
    minPrice, 
    maxPrice, 
    amount, 
    paymentMethods, 
    sortBy, 
    verifiedOnly 
  } = filters;

  const conditions: any = {
    status: "ACTIVE",
    remainingAmount: { gt: 0 }
  };

  if (type === "BUY" || type === "SELL") {
    conditions.type = type;
  }

  // Price range filters
  if (minPrice !== undefined && minPrice !== null && minPrice !== "") {
    const minP = parseFloat(minPrice);
    if (!isNaN(minP)) {
      conditions.price = { ...conditions.price, gte: minP };
    }
  }
  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== "") {
    const maxP = parseFloat(maxPrice);
    if (!isNaN(maxP)) {
      conditions.price = { ...conditions.price, lte: maxP };
    }
  }

  // Pre-filter on amount limits (minLimit / maxLimit)
  if (amount !== undefined && amount !== null && amount !== "") {
    const amt = parseFloat(amount);
    if (!isNaN(amt)) {
      conditions.minLimit = { lte: amt };
      conditions.maxLimit = { gte: amt };
    }
  }

  // Pre-filter on verified only condition
  if (verifiedOnly === "true" || verifiedOnly === true) {
    conditions.merchant = {
      user: {
        verificationStatus: "verified"
      }
    };
  }

  let ads = await prisma.p2PAd.findMany({
    where: conditions,
    include: {
      merchant: {
        include: {
          user: {
            include: {
              paymentMethods: {
                where: { isEnabled: true }
              }
            }
          }
        }
      }
    }
  });

  // Determine Target Payment Methods for intersection filtering
  let targetMethods: string[] = [];
  if (paymentMethods) {
    if (Array.isArray(paymentMethods)) {
      targetMethods = paymentMethods.map((p: string) => p.trim().toUpperCase());
    } else if (typeof paymentMethods === "string" && paymentMethods.trim() !== "") {
      targetMethods = paymentMethods.split(",").map((p: string) => p.trim().toUpperCase());
    }
  }

  // 1. Post-Filter on Payment Methods Intersection
  if (targetMethods.length > 0) {
    ads = ads.filter(ad => {
      const adMethods = ad.paymentMethods ? ad.paymentMethods.split(",").map(p => p.trim().toUpperCase()) : [];
      // Intersection check: must match at least one method
      return adMethods.some(method => targetMethods.includes(method));
    });
  }

  // 2. Sorting & Ranking Implementation
  if (sortBy === "price_asc") {
    ads.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price_desc") {
    ads.sort((a, b) => b.price - a.price);
  } else if (sortBy === "liquidity_desc") {
    ads.sort((a, b) => b.remainingAmount - a.remainingAmount);
  } else {
    // Default / "best_match" ranking:
    // 1. Payment Method Compatibility strength (highest intersection count)
    // 2. Best Price Advantage (SELL: lowest price first; BUY: highest price first)
    // 3. Liquidity (highest remainingAmount first)
    // 4. Verification state (verified first)
    ads.sort((a, b) => {
      // 1. Payment intersection count
      if (targetMethods.length > 0) {
        const aMethods = a.paymentMethods ? a.paymentMethods.split(",").map(p => p.trim().toUpperCase()) : [];
        const bMethods = b.paymentMethods ? b.paymentMethods.split(",").map(p => p.trim().toUpperCase()) : [];
        const aCount = aMethods.filter(p => targetMethods.includes(p)).length;
        const bCount = bMethods.filter(p => targetMethods.includes(p)).length;
        if (aCount !== bCount) {
          return bCount - aCount; // Highest count first
        }
      }

      // 2. Best Price Advantage
      if (a.price !== b.price) {
        if (a.type === "SELL") {
          return a.price - b.price; // Lowest price first
        } else {
          return b.price - a.price; // Highest price first
        }
      }

      // 3. Liquidity
      if (a.remainingAmount !== b.remainingAmount) {
        return b.remainingAmount - a.remainingAmount; // Highest remaining amount first
      }

      // 4. Verification trust status
      const aVerified = a.merchant.user.verificationStatus === "verified" ? 1 : 0;
      const bVerified = b.merchant.user.verificationStatus === "verified" ? 1 : 0;
      return bVerified - aVerified;
    });
  }

  return ads;
}

// GET /api/p2p/ads
router.get("/ads", async (req, res) => {
  try {
    let userId: string | undefined;
    if (req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET || "super-secret-key-123") as any;
        userId = decoded?.id;
      } catch (e) {
        // ignore
      }
    }

    const ads = await getFilteredAndRankedAds(req.query, userId);
    res.json(ads);
  } catch (error: any) {
    console.error("[P2P Ads Fetch Error]", error);
    res.status(500).json({ error: error.message || "Fetch failed" });
  }
});

// POST /api/p2p/ads/search
router.post("/ads/search", async (req, res) => {
  try {
    let userId: string | undefined;
    if (req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET || "super-secret-key-123") as any;
        userId = decoded?.id;
      } catch (e) {
        // ignore
      }
    }

    const ads = await getFilteredAndRankedAds(req.body, userId);
    res.json(ads);
  } catch (error: any) {
    console.error("[P2P Ads Search Error]", error);
    res.status(500).json({ error: error.message || "Search failed" });
  }
});

router.get("/my-ads", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { userId: req.user!.id } });
    if (!merchant) return res.status(404).json({ error: "Merchant not found" });
    const ads = await prisma.p2PAd.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(ads);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

/**
 * 3. Atomic Ad Creation (SELL ads lock funds immediately)
 */
router.post("/ads", authenticate, checkNotFrozen, async (req: AuthRequest, res: Response) => {
  const { type, amount, minLimit, maxLimit, price, paymentMethods, adDisplayName } = req.body;
  const userId = req.user!.id;
  const numAmount = Math.max(0, parseFloat(amount));
  const numPrice = parseFloat(price);

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: { user: { include: { wallet: true } } }
    });

    if (!merchant || merchant.status !== "APPROVED") return res.status(403).json({ error: "Unapproved merchant" });

    // Validate payment methods belong to User Profile (centralized model)
    const selectedList = (Array.isArray(paymentMethods) ? paymentMethods : (paymentMethods ? paymentMethods.split(",") : []))
      .map((p: string) => p.trim().toUpperCase())
      .filter(Boolean);

    if (selectedList.length === 0) {
      return res.status(400).json({ error: "At least one payment method is required." });
    }

    const userMethods = await prisma.userPaymentMethod.findMany({
      where: { userId, isEnabled: true }
    });
    const userBankNames = userMethods.map(m => m.bankName.trim().toUpperCase());

    for (const bank of selectedList) {
      if (!userBankNames.includes(bank)) {
        return res.status(400).json({ error: "Add this payment method to your profile to continue" });
      }
    }

    // Enforce Rate Limits (Admin + 0-3% range)
    const settings = await prisma.globalSetting.findUnique({ where: { id: "singleton" } });
    if (settings) {
      const adminRate = type === "SELL" ? settings.sellRate : settings.buyRate;
      if (numPrice > adminRate || numPrice < adminRate * 0.97) {
        return res.status(400).json({ error: `Price must be between ${(adminRate * 0.97).toFixed(2)} and ${adminRate.toFixed(2)}` });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (type === "SELL") {
        // Atomic balance lock using balance as the predicate to prevent negative balance
        const updatedWallet = await tx.wallet.update({
           where: { userId },
           data: {
             balance: { decrement: numAmount },
             lockedBalance: { increment: numAmount }
           }
        });
        
        // Manual check for SQLite since it doesn't always throw on negative if not constrained
        if (updatedWallet.balance < 0) {
          throw new Error("Insufficient available balance.");
        }
      }

      return await tx.p2PAd.create({
        data: {
          merchantId: merchant.id,
          type,
          amount: numAmount,
          remainingAmount: numAmount,
          minLimit: parseFloat(minLimit),
          maxLimit: parseFloat(maxLimit),
          price: numPrice,
          paymentMethods: selectedList.join(","),
          adDisplayName: adDisplayName || null
        }
      });
    });

    await logAction(userId, "P2P_AD_CREATED", { adId: result.id, type, amount: numAmount });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 3.1 Edit Ad
 */
router.put("/ads/:id", authenticate, checkNotFrozen, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { price, minLimit, maxLimit, amount, paymentMethods, adDisplayName } = req.body;
  const userId = req.user!.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ad = await tx.p2PAd.findUnique({
        where: { id },
        include: { merchant: true, orders: { where: { status: { in: ["PENDING", "PAID"] } } } }
      });

      if (!ad || ad.merchant.userId !== userId) throw new Error("Unauthorized or Ad not found");
      if (ad.status !== "ACTIVE" && ad.status !== "EXPIRED") throw new Error("Only active or expired ads can be edited");
      if (ad.orders.length > 0) throw new Error("Cannot edit ad with active orders");

      const updates: any = {};
      
      if (price !== undefined) {
        const numPrice = parseFloat(price);
        // Enforce Rate Limits (Admin + 0-3% range)
        const settings = await tx.globalSetting.findUnique({ where: { id: "singleton" } });
        if (settings) {
          const adminRate = ad.type === "SELL" ? settings.sellRate : settings.buyRate;
          if (numPrice > adminRate || numPrice < adminRate * 0.97) {
            throw new Error(`Price must be between ${(adminRate * 0.97).toFixed(2)} and ${adminRate.toFixed(2)}`);
          }
        }
        updates.price = numPrice;
      }
      
      if (minLimit !== undefined) updates.minLimit = parseFloat(minLimit);
      if (maxLimit !== undefined) updates.maxLimit = parseFloat(maxLimit);

      if (amount !== undefined) {
        const newAmount = parseFloat(amount);
        const diff = newAmount - ad.amount;

        if (ad.type === "SELL") {
          const updatedWallet = await tx.wallet.update({
            where: { userId },
            data: {
              balance: { decrement: diff },
              lockedBalance: { increment: diff }
            }
          });
          if (updatedWallet.balance < 0) throw new Error("Insufficient balance for amount increase");
        }
        updates.amount = newAmount;
        updates.remainingAmount = ad.remainingAmount + diff;
        if (updates.remainingAmount < 0) throw new Error("Invalid amount change");

        // Reactivate if amount added, Expire if amount cleared
        if (updates.remainingAmount > 0.0001 && ad.status === "EXPIRED") {
          updates.status = "ACTIVE";
        } else if (updates.remainingAmount <= 0.0001 && ad.status === "ACTIVE") {
          updates.status = "EXPIRED";
        }
      }

      if (paymentMethods !== undefined) {
        const selectedList = (Array.isArray(paymentMethods) ? paymentMethods : (paymentMethods ? paymentMethods.split(",") : []))
          .map((p: string) => p.trim().toUpperCase())
          .filter(Boolean);

        if (selectedList.length === 0) {
          throw new Error("At least one payment method is required.");
        }

        const userMethods = await tx.userPaymentMethod.findMany({
          where: { userId, isEnabled: true }
        });
        const userBankNames = userMethods.map(m => m.bankName.trim().toUpperCase());

        for (const bank of selectedList) {
          if (!userBankNames.includes(bank)) {
            throw new Error("Add this payment method to your profile to continue");
          }
        }

        updates.paymentMethods = selectedList.join(",");
      }

      if (adDisplayName !== undefined) {
        updates.adDisplayName = adDisplayName || null;
      }

      return await tx.p2PAd.update({
        where: { id },
        data: updates
      });
    });

    await logAction(userId, "P2P_AD_EDITED", { adId: id });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 3.2 Delete Ad (Soft Delete & Escrow Refund)
 */
router.delete("/ads/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    await prisma.$transaction(async (tx) => {
      const ad = await tx.p2PAd.findUnique({
        where: { id },
        include: { merchant: true, orders: { where: { status: { in: ["PENDING", "PAID"] } } } }
      });

      if (!ad || ad.merchant.userId !== userId) throw new Error("Unauthorized or Ad not found");
      if (ad.orders.length > 0) throw new Error("Cannot delete ad with active orders");

      if (ad.type === "SELL" && ad.remainingAmount > 0) {
        await tx.wallet.update({
          where: { userId },
          data: {
            balance: { increment: ad.remainingAmount },
            lockedBalance: { decrement: ad.remainingAmount }
          }
        });
      }

      await tx.p2PAd.update({
        where: { id },
        data: { status: "DELETED", remainingAmount: 0 }
      });
    });

    await logAction(userId, "P2P_AD_DELETED", { adId: id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 4. Atomic Order Creation (Liquidity Locking & Escrow)
 */
router.post("/orders", authenticate, checkNotFrozen, async (req: AuthRequest, res: Response) => {
  const { adId, amountUsdt, paymentMethod, idempotencyKey } = req.body;
  const buyerId = req.user!.id;
  const qty = Math.max(0, parseFloat(amountUsdt));

  try {
    // 1. Check idempotency if provided (Outside transaction)
    if (idempotencyKey) {
      const existing = await prisma.p2POrder.findUnique({
        where: { idempotencyKey },
        include: { 
          ad: true,
          creator: { include: { paymentMethods: true } },
          merchant: { include: { user: { include: { paymentMethods: true } } } } 
        }
      });
      if (existing) {
        return res.json(existing);
      }
    }

    // 2. Fetch the ad along with merchant and user's payment methods (Outside transaction)
    const ad = await prisma.p2PAd.findUnique({
      where: { id: adId },
      include: { 
        merchant: { 
          include: { 
            user: { 
              include: { 
                paymentMethods: true 
              } 
            } 
          } 
        } 
      }
    });

    if (!ad || ad.status !== "ACTIVE") {
      return res.status(400).json({ error: "Ad inactive." });
    }

    if (ad.remainingAmount < qty) {
      return res.status(400).json({ error: "Insufficient ad liquidity." });
    }

    // Compute fiat amount
    const fiatAmount = qty * ad.price;

    // Validate limit checks
    if (fiatAmount < ad.minLimit || fiatAmount > ad.maxLimit) {
      return res.status(400).json({ error: "Trade limits violated." });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: "Payment method selection is required." });
    }

    const trimmedPm = paymentMethod.trim().toUpperCase();

    // Intersection verification
    const adMethods = ad.paymentMethods ? ad.paymentMethods.split(",").map(p => p.trim().toUpperCase()) : [];
    const merchantProfileMethods = ad.merchant.user.paymentMethods.filter((m: any) => m.isEnabled);
    const merchantProfileBankNames = merchantProfileMethods.map((m: any) => m.bankName.trim().toUpperCase());
    const intersection = adMethods.filter(method => merchantProfileBankNames.includes(method));

    if (!intersection.includes(trimmedPm)) {
      return res.status(400).json({ error: "Selected payment method is not part of the merchant's profile and ad intersection." });
    }

    // Pre-check buyer wallet balance if Buy Ad (Merchant is BUYING, Creator is SELLING)
    if (ad.type === "BUY") {
      const buyerWallet = await prisma.wallet.findUnique({
        where: { userId: buyerId }
      });
      if (!buyerWallet || buyerWallet.balance < qty) {
        return res.status(400).json({ error: "Insufficient balance." });
      }

      // P2 Badge: Validate the recipient's (USDT seller's) payment method for BUY ads
      const creatorPMs = await prisma.userPaymentMethod.findMany({
        where: { userId: buyerId, isEnabled: true }
      });
      const creatorPMBankNames = creatorPMs.map((m: any) => m.bankName.trim().toUpperCase());
      if (!creatorPMBankNames.includes(trimmedPm)) {
        return res.status(400).json({ error: "Please configure and enable this payment method in your profile in order to settle this trade." });
      }
    }

    // 3. Mini, high-speed, interactive transaction with minimal DB operations and NO relation inclusion
    const txResult = await prisma.$transaction(async (tx) => {
      // Re-verify liquidity check inside transaction to prevent race conditions
      const adLock = await tx.p2PAd.findUnique({
        where: { id: adId },
        select: { id: true, status: true, remainingAmount: true, merchantId: true, type: true }
      });

      if (!adLock || adLock.status !== "ACTIVE") {
        throw new Error("Ad inactive.");
      }

      if (adLock.remainingAmount < qty) {
        throw new Error("Insufficient ad liquidity.");
      }

      // Escrow Balance Management
      if (adLock.type === "BUY") {
        const updatedWallet = await tx.wallet.update({
          where: { userId: buyerId },
          data: { balance: { decrement: qty }, lockedBalance: { increment: qty } }
        });
        if (updatedWallet.balance < 0) {
          throw new Error("Insufficient balance.");
        }
      }

      // Update Ad remaining liquidity
      const remaining = Math.max(0, adLock.remainingAmount - qty);
      await tx.p2PAd.update({
        where: { id: adId },
        data: { 
          remainingAmount: remaining,
          status: remaining < 0.0001 ? "EXPIRED" : "ACTIVE"
        }
      });

      // Quick Order Creation with absolutely no includes
      const newOrder = await tx.p2POrder.create({
        data: {
          adId, 
          creatorId: buyerId, 
          merchantId: adLock.merchantId, 
          type: adLock.type,
          amountUsdt: qty, 
          amountEtb: fiatAmount, 
          status: "PENDING",
          paymentMethod: trimmedPm, 
          idempotencyKey,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      });

      return { id: newOrder.id };
    });

    // 4. Load full order relationship details OUTSIDE transaction
    const orderDetails = await prisma.p2POrder.findUnique({
      where: { id: txResult.id },
      include: { 
        ad: true,
        creator: { include: { paymentMethods: true } },
        merchant: { include: { user: { include: { paymentMethods: true } } } } 
      }
    });

    if (!orderDetails) {
      return res.status(500).json({ error: "Failed to load order details." });
    }

    await logAction(buyerId, "P2P_ORDER_CREATED", { orderId: orderDetails.id });

    // Notify participants in real-time - entirely non-blocking and isolated
    try {
      const isSellAd = orderDetails.type === "SELL";
      const formattedQty = orderDetails.amountUsdt.toFixed(2);
      const formattedFiat = orderDetails.amountEtb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      if (isSellAd) {
        // Creator is BUYER, Merchant is SELLER
        sendNotification(
          buyerId,
          "ORDER_CREATED",
          "P2P Buy Order Initiated",
          `Your buy order #${orderDetails.id.slice(-6)} for ${formattedQty} USDT is active. Please pay ${formattedFiat} ETB.`,
          { orderId: orderDetails.id, role: "BUYER" }
        ).catch(err => {
          console.error(`[P2P Order Create Notification Error] Failed to notify buyer:`, err);
        });

        sendNotification(
          orderDetails.merchant.userId,
          "ORDER_CREATED",
          "New P2P Sell Order Received",
          `A buyer has opened order #${orderDetails.id.slice(-6)} to purchase ${formattedQty} USDT for ${formattedFiat} ETB.`,
          { orderId: orderDetails.id, role: "SELLER" }
        ).catch(err => {
          console.error(`[P2P Order Create Notification Error] Failed to notify merchant:`, err);
        });
      } else {
        // Creator is SELLER, Merchant is BUYER
        sendNotification(
          buyerId,
          "ORDER_CREATED",
          "P2P Sell Order Locked",
          `Your sell order #${orderDetails.id.slice(-6)} for ${formattedQty} USDT is locked in Escrow. Wait for the buyer's payment.`,
          { orderId: orderDetails.id, role: "SELLER" }
        ).catch(err => {
          console.error(`[P2P Order Create Notification Error] Failed to notify seller:`, err);
        });

        sendNotification(
          orderDetails.merchant.userId,
          "ORDER_CREATED",
          "New P2P Buy Order Received",
          `You have an active order #${orderDetails.id.slice(-6)} to buy ${formattedQty} USDT. Please pay ${formattedFiat} ETB to matching seller.`,
          { orderId: orderDetails.id, role: "BUYER" }
        ).catch(err => {
          console.error(`[P2P Order Create Notification Error] Failed to notify merchant buyer:`, err);
        });
      }
    } catch (notifErr) {
      console.error("[P2P Order Create Notification Error] Critical notification routing failure:", notifErr);
    }

    return res.json(orderDetails);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * 5. Order State Management
 */
router.get("/orders", authenticate, async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.p2POrder.findMany({
      where: { OR: [{ creatorId: req.user!.id }, { merchant: { userId: req.user!.id } }] },
      include: { 
        ad: true, 
        creator: { include: { paymentMethods: true } }, 
        merchant: { include: { user: { include: { paymentMethods: true } } } } 
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

router.post("/orders/:id/paid", authenticate, checkNotFrozen, upload.single("proof"), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    let paymentProof = req.body.paymentProof; // Fallback for legacy/manual if provided

    if (req.file) {
      try {
        paymentProof = await uploadToCloudinary(req.file.buffer, 'p2p_proofs');
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError);
        return res.status(500).json({ error: "Failed to upload image to storage" });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.p2POrder.findUnique({ 
        where: { id },
        include: { merchant: true }
      });
      if (!order) throw new Error("Order not found");
      
      // Strict Transition Rule: PENDING -> PAID
      if (order.status !== "PENDING") throw new Error("Invalid transition: Order must be PENDING to mark as PAID.");

      const isBuyerCheck = (order.type === "SELL" && order.creatorId === userId) || (order.type === "BUY" && order.merchant.userId === userId);
      
      if (!isBuyerCheck) throw new Error("Only the buyer can confirm payment.");

      const update = await tx.p2POrder.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "PAID", paymentProof, paidAt: new Date() }
      });
      if (update.count === 0) throw new Error("Race condition: Order state changed.");

      return order;
    });

    const buyerId = result.type === "SELL" ? result.creatorId : result.merchant.userId;
    const sellerId = result.type === "SELL" ? result.merchant.userId : result.creatorId;

    try {
      sendNotification(
        buyerId,
        "ORDER_PAID",
        "P2P Order Marked Paid",
        `You marked order #${result.id.slice(-6)} as PAID. The seller has been requested to inspect payment and release USDT.`,
        { orderId: result.id, role: "BUYER" }
      ).catch(err => {
        console.error(`[P2P Paid Notification Error] Failed to notify buyer:`, err);
      });

      sendNotification(
        sellerId,
        "ORDER_PAID",
        "P2P Payment Confirmation Received",
        `The buyer of order #${result.id.slice(-6)} has submitted payment proof. Please verify receipt and release the escrow USDT.`,
        { orderId: result.id, role: "SELLER" }
      ).catch(err => {
        console.error(`[P2P Paid Notification Error] Failed to notify seller:`, err);
      });
    } catch (notifErr) {
      console.error("[P2P Paid Notification Error] Critical notification layout failure:", notifErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/orders/:id/release", authenticate, checkNotFrozen, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "ADMIN";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.p2POrder.findUnique({ 
        where: { id }, 
        include: { merchant: { include: { user: true } } } 
      });
      if (!order) throw new Error("Order not found.");
      
      // Strict Transition Rule: PAID -> COMPLETED or DISPUTED -> COMPLETED (Admin)
      const isDisputedResolve = order.status === "DISPUTED" && isAdmin;
      const isNormalRelease = order.status === "PAID";

      if (!isDisputedResolve && !isNormalRelease) {
        throw new Error("Invalid transition: Release only possible from PAID or DISPUTED (Admin)");
      }

      if (!isAdmin) {
        const isSeller = (order.type === "SELL" && order.merchant.userId === userId) || (order.type === "BUY" && order.creatorId === userId);
        if (!isSeller) throw new Error("Only the seller can release funds.");
      }

      const update = await tx.p2POrder.updateMany({
        where: { id, status: order.status },
        data: { status: "COMPLETED", completedAt: new Date(), releasedAt: new Date() }
      });
      if (update.count === 0) throw new Error("Race condition: Order state changed.");

      const payerId = order.type === "SELL" ? order.merchant.userId : order.creatorId;
      const payeeId = order.type === "SELL" ? order.creatorId : order.merchant.userId;

      await tx.wallet.update({
        where: { userId: payerId },
        data: { lockedBalance: { decrement: order.amountUsdt } }
      });

      await tx.wallet.update({
        where: { userId: payeeId },
        data: { balance: { increment: order.amountUsdt } }
      });

      return order;
    });

    const buyerId = result.type === "SELL" ? result.creatorId : result.merchant.userId;
    const sellerId = result.type === "SELL" ? result.merchant.userId : result.creatorId;

    try {
      sendNotification(
        buyerId,
        "ORDER_RELEASED",
        "P2P Escrow Released! 🚀",
        `The seller has released ${result.amountUsdt.toFixed(2)} USDT. Funds are now available in your wallet.`,
        { orderId: result.id, role: "BUYER" }
      ).catch(err => {
        console.error(`[P2P Release Notification Error] Failed to notify buyer:`, err);
      });

      sendNotification(
        sellerId,
        "ORDER_RELEASED",
        "P2P Order Completed Successfully",
        `You released ${result.amountUsdt.toFixed(2)} USDT for order #${result.id.slice(-6)}. Escrow locked balance updated.`,
        { orderId: result.id, role: "SELLER" }
      ).catch(err => {
        console.error(`[P2P Release Notification Error] Failed to notify seller:`, err);
      });
    } catch (notifErr) {
      console.error("[P2P Release Notification Error] Critical notification routing failure:", notifErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/orders/:id/cancel", authenticate, checkNotFrozen, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "ADMIN";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.p2POrder.findUnique({ 
        where: { id }, 
        include: { merchant: { include: { user: true } } } 
      });
      if (!order) throw new Error("Order not found.");

      // Strict Transition Rule: PENDING -> CANCELLED or DISPUTED -> CANCELLED (Admin)
      const isDisputedCancel = order.status === "DISPUTED" && isAdmin;
      const isNormalCancel = order.status === "PENDING";

      if (!isDisputedCancel && !isNormalCancel) {
        throw new Error("Invalid transition: Cancellation only possible from PENDING or DISPUTED (Admin)");
      }

      if (!isAdmin) {
        const merchantObj = await tx.merchant.findUnique({ where: { id: order.merchantId } });
        const isBuyer = (order.type === "SELL" && order.creatorId === userId) || (order.type === "BUY" && merchantObj?.userId === userId);
        const isSeller = (order.type === "SELL" && merchantObj?.userId === userId) || (order.type === "BUY" && order.creatorId === userId);
        
        if (!isBuyer && !isSeller) throw new Error("Unauthorized.");
        if (order.status === "PENDING" && !isBuyer) {
          throw new Error("Sellers are not allowed to cancel the order. Only the buyer can cancel.");
        }
      }

      const update = await tx.p2POrder.updateMany({
        where: { id, status: order.status },
        data: { status: "CANCELLED", cancelledAt: new Date() }
      });
      if (update.count === 0) throw new Error("Race condition: Order state changed.");

      // Refund buyer lock if they were selling (Ad BUY type)
      if (order.type === "BUY") {
        await tx.wallet.update({
          where: { userId: order.creatorId },
          data: { balance: { increment: order.amountUsdt }, lockedBalance: { decrement: order.amountUsdt } }
        });
      }

      // Ad recovery
      const ad = await tx.p2PAd.findUnique({ where: { id: order.adId } });
      if (ad) {
        const newRemaining = ad.remainingAmount + order.amountUsdt;
        await tx.p2PAd.update({
          where: { id: order.adId },
          data: { 
            remainingAmount: newRemaining,
            status: ad.status === "EXPIRED" ? "ACTIVE" : ad.status
          }
        });
      }

      return order;
    });

    const buyerId = result.type === "SELL" ? result.creatorId : result.merchant.userId;
    const sellerId = result.type === "SELL" ? result.merchant.userId : result.creatorId;

    try {
      sendNotification(
        buyerId,
        "ORDER_CANCELLED",
        "P2P Order Cancelled",
        `Order #${result.id.slice(-6)} has been cancelled. Any locked balances have been refunded.`,
        { orderId: result.id, role: "BUYER" }
      ).catch(err => {
        console.error(`[P2P Cancel Notification Error] Failed to notify buyer:`, err);
      });

      sendNotification(
        sellerId,
        "ORDER_CANCELLED",
        "P2P Order Cancelled",
        `Order #${result.id.slice(-6)} has been cancelled. Escrow locked crypto has been restored.`,
        { orderId: result.id, role: "SELLER" }
      ).catch(err => {
        console.error(`[P2P Cancel Notification Error] Failed to notify seller:`, err);
      });
    } catch (notifErr) {
      console.error("[P2P Cancel Notification Error] Critical notification routing failure:", notifErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/orders/:id/dispute", authenticate, checkNotFrozen, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user!.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.p2POrder.findUnique({ 
        where: { id },
        include: { merchant: true }
      });
      if (!order) throw new Error("Order not found");
      
      // Strict Transition Rule: PENDING/PAID -> DISPUTED
      if (order.status !== "PENDING" && order.status !== "PAID") {
        throw new Error("Only pending or paid orders can be disputed.");
      }

      const isParticipant = (order.creatorId === userId) || (order.merchant.userId === userId);
      if (!isParticipant) throw new Error("Unauthorized.");

      const update = await tx.p2POrder.updateMany({
        where: { id, status: order.status },
        data: { status: "DISPUTED", disputeReason: reason, disputedAt: new Date() }
      });
      if (update.count === 0) throw new Error("Race condition: Order state changed.");

      return order;
    });

    const buyerId = result.type === "SELL" ? result.creatorId : result.merchant.userId;
    const sellerId = result.type === "SELL" ? result.merchant.userId : result.creatorId;

    try {
      sendNotification(
        buyerId,
        "ORDER_DISPUTED",
        "P2P Conflict: Dispute Opened ⚠️",
        `A support dispute has been submitted for trade #${result.id.slice(-6)}. Zemen desk is reviewing payment proofs.`,
        { orderId: result.id, reason }
      ).catch(err => {
        console.error(`[P2P Dispute Notification Error] Failed to notify buyer:`, err);
      });

      sendNotification(
        sellerId,
        "ORDER_DISPUTED",
        "P2P Conflict: Dispute Opened ⚠️",
        `A support dispute has been submitted for trade #${result.id.slice(-6)}. Zemen desk is reviewing payment proofs.`,
        { orderId: result.id, reason }
      ).catch(err => {
        console.error(`[P2P Dispute Notification Error] Failed to notify seller:`, err);
      });
    } catch (notifErr) {
      console.error("[P2P Dispute Notification Error] Critical notification routing failure:", notifErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

let isExpiryCheckRunning = false;

export async function runExpiryCheck() {
  if (isExpiryCheckRunning) {
    console.log("[P2P Worker] Expiry check already in progress, skipping.");
    return;
  }
  isExpiryCheckRunning = true;
  try {
    const expiredOrders = await prisma.p2POrder.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: new Date()
        }
      },
      select: {
        id: true
      }
    });

    if (expiredOrders.length === 0) return;

    console.log(`[P2P Worker] Found ${expiredOrders.length} expired orders to clean up.`);

    for (const order of expiredOrders) {
      try {
        const freshOrder = await prisma.$transaction(async (tx) => {
          const innerFreshOrder = await tx.p2POrder.findUnique({
            where: { id: order.id },
            include: { merchant: true }
          });

          if (!innerFreshOrder || innerFreshOrder.status !== "PENDING") {
            return null;
          }

          const update = await tx.p2POrder.updateMany({
            where: { id: order.id, status: "PENDING" },
            data: { status: "EXPIRED" }
          });

          if (update.count === 0) return null;

          if (innerFreshOrder.type === "BUY") {
            await tx.wallet.update({
              where: { userId: innerFreshOrder.creatorId },
              data: { balance: { increment: innerFreshOrder.amountUsdt }, lockedBalance: { decrement: innerFreshOrder.amountUsdt } }
            });
          }

          const ad = await tx.p2PAd.findUnique({ where: { id: innerFreshOrder.adId } });
          if (ad) {
            const newRemaining = ad.remainingAmount + innerFreshOrder.amountUsdt;
            await tx.p2PAd.update({
              where: { id: innerFreshOrder.adId },
              data: { 
                remainingAmount: newRemaining,
                status: ad.status === "EXPIRED" ? "ACTIVE" : ad.status
              }
            });
          }

          await tx.auditLog.create({
            data: {
              userId: innerFreshOrder.creatorId,
              action: "P2P_ORDER_AUTO_EXPIRED",
              details: JSON.stringify({ orderId: innerFreshOrder.id, amount: innerFreshOrder.amountUsdt })
            }
          });

          return innerFreshOrder;
        });

        if (freshOrder) {
          console.log(`[P2P Worker] Order ${freshOrder.id} successfully marked as EXPIRED.`);

          // Notify Buyer and Seller of expirations
          const buyerId = freshOrder.type === "SELL" ? freshOrder.creatorId : freshOrder.merchant.userId;
          const sellerId = freshOrder.type === "SELL" ? freshOrder.merchant.userId : freshOrder.creatorId;

          // Dispatch notifications asynchronously to avoid blocking the worker loop or DB transaction flow
          sendNotification(
            buyerId,
            "ORDER_EXPIRED",
            "Payment Window Expired",
            `Your P2P order #${freshOrder.id.slice(-6)} has expired because the 15-minute payment window closed.`,
            { orderId: freshOrder.id }
          ).catch(err => {
            console.error(`[P2P Worker Error] Failed to send buyer expiration notification for ${freshOrder.id}:`, err);
          });

          sendNotification(
            sellerId,
            "ORDER_EXPIRED",
            "Payment Window Expired",
            `P2P trade #${freshOrder.id.slice(-6)} expired. Locked funds have been returned to you safely.`,
            { orderId: freshOrder.id }
          ).catch(err => {
            console.error(`[P2P Worker Error] Failed to send seller expiration notification for ${freshOrder.id}:`, err);
          });
        }
      } catch (err) {
        console.error(`[P2P Worker] Error expiring order ${order.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[P2P Worker] Error running expiry check:", err);
  } finally {
    isExpiryCheckRunning = false;
  }
}

export default router;
