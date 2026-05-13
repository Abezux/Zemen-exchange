/**
 * P2P Trading System with Atomic Consistency and Escrow Safety
 */

import express, { Response } from "express";
import { AuthRequest, authenticate, checkNotFrozen } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";

const router = express.Router();

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
  const { businessName, phoneNumber, bio } = req.body;
  if (!req.user?.id) return res.status(401).json({ error: "Auth missing" });

  try {
    const existingMerchant = await prisma.merchant.findUnique({ where: { userId: req.user.id } });
    if (existingMerchant) {
      if (existingMerchant.status === "PENDING") return res.status(400).json({ error: "Pending application exists." });
      if (existingMerchant.status === "APPROVED") return res.status(400).json({ error: "Already approved." });

      const updated = await prisma.merchant.update({
        where: { id: existingMerchant.id },
        data: { businessName, phoneNumber, bio, status: "PENDING" }
      });
      return res.json(updated);
    }

    const merchant = await prisma.merchant.create({
      data: { userId: req.user.id, businessName, phoneNumber, bio: bio || "", status: "PENDING" }
    });
    res.json(merchant);
  } catch (error) {
    res.status(500).json({ error: "Application failed" });
  }
});

/**
 * 2. Marketplace & Liquidity Retrieval
 */
router.get("/ads", async (req, res) => {
  try {
    const ads = await prisma.p2PAd.findMany({
      where: { status: "ACTIVE", remainingAmount: { gt: 0 } },
      include: { merchant: { include: { user: true } } }
    });
    res.json(ads);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
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
  const { type, amount, minLimit, maxLimit, price } = req.body;
  const userId = req.user!.id;
  const numAmount = Math.max(0, parseFloat(amount));
  const numPrice = parseFloat(price);

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: { user: { include: { wallet: true } } }
    });

    if (!merchant || merchant.status !== "APPROVED") return res.status(403).json({ error: "Unapproved merchant" });

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
          price: numPrice
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
  const { price, minLimit, maxLimit, amount } = req.body;
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
    const result = await prisma.$transaction(async (tx) => {
      // 1. Precise Liquidity Lock
      const ad = await tx.p2PAd.findUnique({ where: { id: adId }, include: { merchant: true } });
      if (!ad || ad.status !== "ACTIVE") throw new Error("Ad inactive.");
      if (ad.remainingAmount < qty) throw new Error("Insufficient ad liquidity.");

      const fiatAmount = qty * ad.price;
      if (fiatAmount < ad.minLimit || fiatAmount > ad.maxLimit) throw new Error("Trade limits violated.");

      // Check for idempotency if provided
      if (idempotencyKey) {
        const existing = await tx.p2POrder.findUnique({ where: { idempotencyKey } });
        if (existing) return existing;
      }

      // 2. Escrow Management
      if (ad.type === "BUY") {
        // Merchant is buying, Creator is selling. Lock creator's funds.
        const updatedWallet = await tx.wallet.update({
          where: { userId: buyerId },
          data: { balance: { decrement: qty }, lockedBalance: { increment: qty } }
        });
        if (updatedWallet.balance < 0) throw new Error("Insufficient balance.");
      }

      // Update Ad remaining liquidity
      const remaining = Math.max(0, ad.remainingAmount - qty);
      await tx.p2PAd.update({
        where: { id: adId },
        data: { 
          remainingAmount: remaining,
          status: remaining < 0.0001 ? "EXPIRED" : "ACTIVE"
        }
      });

      return await tx.p2POrder.create({
        data: {
          adId, creatorId: buyerId, merchantId: ad.merchantId, type: ad.type,
          amountUsdt: qty, amountEtb: fiatAmount, status: "PENDING",
          paymentMethod, idempotencyKey
        },
        include: { merchant: { include: { user: true } } }
      });
    });

    await logAction(buyerId, "P2P_ORDER_CREATED", { orderId: result.id });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 5. Order State Management
 */
router.get("/orders", authenticate, async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.p2POrder.findMany({
      where: { OR: [{ creatorId: req.user!.id }, { merchant: { userId: req.user!.id } }] },
      include: { ad: true, creator: true, merchant: { include: { user: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

router.post("/orders/:id/paid", authenticate, checkNotFrozen, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { paymentProof, proofId } = req.body;
  const userId = req.user!.id;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.p2POrder.findUnique({ where: { id } });
      if (!order) throw new Error("Order not found");
      
      // Strict Transition Rule: PENDING -> PAID
      if (order.status !== "PENDING") throw new Error("Invalid transition: Order must be PENDING to mark as PAID.");

      const merchant = await tx.merchant.findUnique({ where: { id: order.merchantId } });
      const isBuyerCheck = (order.type === "SELL" && order.creatorId === userId) || (order.type === "BUY" && merchant?.userId === userId);
      
      if (!isBuyerCheck) throw new Error("Only the buyer can confirm payment.");

      const update = await tx.p2POrder.updateMany({
        where: { id, status: "PENDING" },
        data: { 
          status: "PAID", 
          paymentProof: proofId ? `/uploads/${proofId}` : paymentProof,
          proofId: proofId || null
        }
      });
      if (update.count === 0) throw new Error("Race condition: Order state changed.");
    });
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
    await prisma.$transaction(async (tx) => {
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
        data: { status: "COMPLETED", completedAt: new Date() }
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
    });
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
    await prisma.$transaction(async (tx) => {
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
        const isBuyer = (order.type === "SELL" && order.creatorId === userId) || (order.type === "BUY" && order.merchant.userId === userId);
        const isSeller = (order.type === "SELL" && order.merchant.userId === userId) || (order.type === "BUY" && order.creatorId === userId);
        if (!isBuyer && !isSeller) throw new Error("Unauthorized.");
      }

      const update = await tx.p2POrder.updateMany({
        where: { id, status: order.status },
        data: { status: "CANCELLED" }
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
    });
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
    await prisma.$transaction(async (tx) => {
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
        data: { status: "DISPUTED", disputeReason: reason }
      });
      if (update.count === 0) throw new Error("Race condition: Order state changed.");
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
