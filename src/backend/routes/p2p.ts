import express, { Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";

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

// 1. Merchant Application
router.post("/merchant/apply", authenticate, async (req: AuthRequest, res: Response) => {
  const { businessName, phoneNumber, bio } = req.body;
  
  if (!req.user?.id) {
    return res.status(401).json({ error: "User authentication missing from request" });
  }

  try {
    // Check if user already has a merchant record
    const existingMerchant = await prisma.merchant.findUnique({
      where: { userId: req.user.id }
    });

    if (existingMerchant) {
      if (existingMerchant.status === "PENDING") {
        return res.status(400).json({ error: "You already have a pending application." });
      }
      if (existingMerchant.status === "APPROVED") {
        return res.status(400).json({ error: "You are already an approved merchant." });
      }

      const updated = await prisma.merchant.update({
        where: { id: existingMerchant.id },
        data: {
          businessName,
          phoneNumber,
          bio,
          status: "PENDING"
        }
      });
      await logAction(req.user.id, "MERCHANT_RE_APPLICATION_SUBMITTED", { businessName });
      return res.json(updated);
    }

    const merchant = await prisma.merchant.create({
      data: {
        userId: req.user.id,
        businessName,
        phoneNumber,
        bio: bio || "",
        status: "PENDING"
      }
    });
    await logAction(req.user.id, "MERCHANT_APPLICATION_SUBMITTED", { businessName });
    res.json(merchant);
  } catch (error: any) {
    console.error("Merchant application error:", error);
    res.status(500).json({ error: "Failed to apply. Database error or missing fields." });
  }
});

// 2. Get active ads
router.get("/ads", async (req: AuthRequest, res: Response) => {
  try {
    const ads = await prisma.p2PAd.findMany({
      where: { status: "ACTIVE" },
      include: { merchant: { include: { user: true } } }
    });
    res.json(ads);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ads" });
  }
});

// 2.5 Get My Ads (Merchant Only)
router.get("/my-ads", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user!.id }
    });
    if (!merchant) return res.status(404).json({ error: "Merchant not found" });

    const ads = await prisma.p2PAd.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(ads);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch your ads" });
  }
});

// 3. Create Ad (Merchant Only)
router.post("/ads", authenticate, async (req: AuthRequest, res: Response) => {
  const { type, amount, minLimit, maxLimit, price } = req.body;
  const numAmount = parseFloat(amount);
  const numPrice = parseFloat(price);
  const numMinLimit = parseFloat(minLimit);
  const numMaxLimit = parseFloat(maxLimit);

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user!.id },
      include: { user: { include: { wallet: true } } }
    });

    if (!merchant || merchant.status !== "APPROVED") {
      return res.status(403).json({ error: "Only approved merchants can post ads" });
    }

    // 1. Balance Constraint (Only for SELL ads, as merchant is selling their USDT)
    if (type === "SELL") {
      const wallet = merchant.user.wallet;
      if (!wallet || wallet.balance < numAmount) {
        return res.status(400).json({ error: `Insufficient wallet balance. You have ${wallet?.balance || 0} USDT.` });
      }
    }

    // 2. Rate Constraint
    const settings = await prisma.globalSetting.findUnique({ where: { id: "singleton" } });
    if (settings) {
      const adminRate = type === "SELL" ? settings.sellRate : settings.buyRate;
      const minAllowedRate = adminRate * 0.97;
      if (numPrice > adminRate || numPrice < minAllowedRate) {
        return res.status(400).json({ 
          error: `Price out of range. Must be between ${minAllowedRate.toFixed(2)} and ${adminRate.toFixed(2)} ETB.` 
        });
      }
    }

    // 3. Min/Max Order Logic
    const maxOrderCalculated = numAmount * numPrice;
    if (numMinLimit < 500) {
      return res.status(400).json({ error: "Minimum order must be at least 500 ETB." });
    }
    if (numMinLimit >= maxOrderCalculated) {
      return res.status(400).json({ error: `Minimum limit (${numMinLimit}) cannot exceed maximum total value (${maxOrderCalculated.toFixed(2)} ETB).` });
    }
    if (numMaxLimit > maxOrderCalculated) {
      return res.status(400).json({ error: `Maximum limit cannot exceed total value (${maxOrderCalculated.toFixed(2)} ETB).` });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Lock balance for SELL ads immediately
      if (type === "SELL") {
        await tx.wallet.update({
          where: { userId: req.user!.id },
          data: { balance: { decrement: numAmount } }
        });
      }

      return await tx.p2PAd.create({
        data: {
          merchantId: merchant.id,
          type,
          amount: numAmount,
          minLimit: numMinLimit,
          maxLimit: numMaxLimit,
          price: numPrice
        }
      });
    });

    await logAction(req.user!.id, "P2P_AD_CREATED", { adId: result.id, type, amount: numAmount });
    res.json(result);
  } catch (error: any) {
    console.error("Ad creation error:", error);
    res.status(500).json({ error: error.message || "Failed to create ad" });
  }
});

// 4. Create Order (Response to Ad)
router.post("/orders", authenticate, async (req: AuthRequest, res: Response) => {
  const { adId, amountUsdt, paymentMethod } = req.body;
  const buyerId = req.user!.id;
  const numAmountUsdt = parseFloat(amountUsdt);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ad = await tx.p2PAd.findUnique({
        where: { id: adId },
        include: { merchant: true }
      });

      if (!ad || ad.status !== "ACTIVE") throw new Error("Ad not found or inactive");
      
      const amountEtb = numAmountUsdt * ad.price;

      // Validation check for order limits
      if (amountEtb < ad.minLimit || amountEtb > ad.maxLimit) {
        throw new Error(`Amount must be between ${ad.minLimit} and ${ad.maxLimit} ETB`);
      }
      
      if (ad.amount < numAmountUsdt) throw new Error("Insufficient amount remaining in this ad");

      // Escrow Logic:
      // If Ad type SELL (Merchant selling), Merchant balance was ALREADY locked during Ad creation.
      // We just need to make sure we don't lock it again from wallet, 
      // but the order still needs to be "escrowed" in the sense that it's taken from the Ad pool.
      
      // If user is SELLING (Ad type BUY), they must have sufficient balance
      if (ad.type === "BUY") {
        const wallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
        if (!wallet || wallet.balance < numAmountUsdt) throw new Error("Insufficient balance to sell");
        
        // Lock balance (Escrow) from User
        await tx.wallet.update({
          where: { userId: buyerId },
          data: { balance: { decrement: numAmountUsdt } }
        });
      } else {
        // Ad type SELL means merchant is selling.
        // Funds were already locked during Ad creation.
        // Nothing to decrement here from wallet, just verify ad amount (done above).
      }

      const order = await tx.p2POrder.create({
        data: {
          adId,
          creatorId: buyerId,
          merchantId: ad.merchantId,
          type: ad.type,
          amountUsdt: numAmountUsdt,
          amountEtb,
          status: "PENDING",
          paymentMethod
        }
      });

      // Reduce ad amount available
      await tx.p2PAd.update({
        where: { id: adId },
        data: { amount: { decrement: numAmountUsdt } }
      });

      return order;
    });

    await logAction(req.user!.id, "P2P_ORDER_CREATED", { orderId: result.id });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create order" });
  }
});

// 5. Get My Orders
router.get("/orders", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.p2POrder.findMany({
      where: {
        OR: [
          { creatorId: req.user!.id },
          { merchant: { userId: req.user!.id } }
        ]
      },
      include: { 
        ad: true, 
        creator: true,
        merchant: { include: { user: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// 6. Mark Order as Paid
router.post("/orders/:id/paid", authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { paymentProof } = req.body;
  const userId = req.user!.id;

  try {
    const order = await prisma.p2POrder.findUnique({
      where: { id },
      include: { merchant: true }
    });

    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "PENDING") return res.status(400).json({ error: "Order must be in PENDING status to mark as paid" });
    
    // Role Check: Only the payer can mark as paid.
    // If order type is SELL, the creator (Buyer) pays.
    // If order type is BUY, the merchant (Buyer) pays.
    const isPayer = (order.type === "SELL" && order.creatorId === userId) || 
                    (order.type === "BUY" && order.merchant.userId === userId);

    if (!isPayer) {
      return res.status(403).json({ error: "Only the payer can mark this order as paid." });
    }

    await prisma.p2POrder.update({
      where: { id },
      data: { 
        status: "PAID",
        paymentProof: paymentProof || null
      }
    });

    await logAction(userId, "P2P_ORDER_MARKED_PAID", { orderId: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update order" });
  }
});

// 6.5 Cancel Order
router.post("/orders/:id/cancel", authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.p2POrder.findUnique({
        where: { id },
        include: { merchant: { include: { user: true } }, ad: true }
      });

      if (!order) throw new Error("Order not found");
      if (order.status !== "PENDING") throw new Error("Only pending orders can be cancelled");
      
      // Verification: Only the creator (user) or merchant can cancel?
      // User requirement says: "Cancel Order (only if no payment was sent)"
      // This implies the buyer (the one who needs to pay) can cancel.
      
      // Return escrowed funds
      const sellerUserId = order.type === "SELL" ? order.merchant.userId : order.creatorId;
      
      await tx.wallet.update({
        where: { userId: sellerUserId },
        data: { balance: { increment: order.amountUsdt } }
      });

      // Update Order
      await tx.p2POrder.update({
        where: { id },
        data: { status: "CANCELLED" }
      });

      // Return amount to Ad pool
      await tx.p2PAd.update({
        where: { id: order.adId },
        data: { amount: { increment: order.amountUsdt } }
      });

      return { success: true };
    });

    await logAction(userId, "P2P_ORDER_CANCELLED", { orderId: id });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to cancel order" });
  }
});

// 7. Merchant/User Releases USDT (Confirmation of ETB receipt)
router.post("/orders/:id/release", authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const order = await prisma.p2POrder.findUnique({
      where: { id },
      include: { ad: true, creator: true, merchant: true }
    });

    if (!order || order.status !== "PAID") {
      return res.status(400).json({ error: "Order must be marked as PAID first" });
    }
    
    await prisma.$transaction(async (tx) => {
      // 1. Mark order as completed
      await tx.p2POrder.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() }
      });

      // 2. Handle Funds Transfer
      if (order.type === "SELL") { 
        // Ad type SELL means merchant sold, user bought.
        // Funds should go from Merchant to User.
        // (Merchant's ad amount was already reduced, but we need to update user balance)
        await tx.wallet.update({
          where: { userId: order.creatorId },
          data: { balance: { increment: order.amountUsdt } }
        });
      } else { 
        // Ad type BUY means merchant bought, user sold.
        // User's balance was already locked (decremented) during order creation.
        // Now it goes to the merchant.
        await tx.wallet.update({
          where: { userId: order.merchant.userId },
          data: { balance: { increment: order.amountUsdt } }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "P2P_FUNDS_RELEASED",
          details: JSON.stringify({ orderId: id, amountUsdt: order.amountUsdt })
        }
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Release error", error);
    res.status(500).json({ error: "Failed to release funds" });
  }
});

// 8. Open Dispute
router.post("/orders/:id/dispute", authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    await prisma.p2POrder.update({
      where: { id },
      data: { 
        status: "DISPUTED",
        disputeReason: reason
      }
    });
    await logAction(req.user!.id, "P2P_ORDER_DISPUTED", { orderId: id, reason });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to open dispute" });
  }
});

export default router;
