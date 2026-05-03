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
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user!.id }
    });

    if (!merchant || merchant.status !== "APPROVED") {
      return res.status(403).json({ error: "Only approved merchants can post ads" });
    }

    const ad = await prisma.p2PAd.create({
      data: {
        merchantId: merchant.id,
        type,
        amount: parseFloat(amount),
        minLimit: parseFloat(minLimit),
        maxLimit: parseFloat(maxLimit),
        price: parseFloat(price)
      }
    });
    await logAction(req.user!.id, "P2P_AD_CREATED", { adId: ad.id, type });
    res.json(ad);
  } catch (error) {
    res.status(500).json({ error: "Failed to create ad" });
  }
});

// 4. Create Order (Response to Ad)
router.post("/orders", authenticate, async (req: AuthRequest, res: Response) => {
  const { adId, amountUsdt } = req.body;
  const buyerId = req.user!.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ad = await tx.p2PAd.findUnique({
        where: { id: adId },
        include: { merchant: true }
      });

      if (!ad || ad.status !== "ACTIVE") throw new Error("Ad not found or inactive");
      if (ad.amount < amountUsdt) throw new Error("Insufficient amount in ad");

      const amountEtb = amountUsdt * ad.price;

      // If user is SELLING (Ad type BUY), they must have sufficient balance
      if (ad.type === "BUY") {
        const wallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
        if (!wallet || wallet.balance < amountUsdt) throw new Error("Insufficient balance to sell");
        
        // Lock balance (Escrow)
        await tx.wallet.update({
          where: { userId: buyerId },
          data: { balance: { decrement: amountUsdt } }
        });
      }

      const order = await tx.p2POrder.create({
        data: {
          adId,
          creatorId: buyerId,
          merchantId: ad.merchantId,
          type: ad.type,
          amountUsdt,
          amountEtb,
          status: "PENDING"
        }
      });

      // Reduce ad amount available
      await tx.p2PAd.update({
        where: { id: adId },
        data: { amount: { decrement: amountUsdt } }
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
  try {
    const order = await prisma.p2POrder.findUnique({
      where: { id },
      include: { merchant: true }
    });

    if (!order) return res.status(404).json({ error: "Order not found" });
    
    // Whoever is supposed to send the money marks it as paid
    // If user buys (Ad SELL), user marks paid.
    // If user sells (Ad BUY), merchant marks paid? Or user confirms receipt?
    // Usually the Payer marks as paid.
    
    await prisma.p2POrder.update({
      where: { id },
      data: { status: "PAID" }
    });

    await logAction(req.user!.id, "P2P_ORDER_MARKED_PAID", { orderId: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update order" });
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

export default router;
