import { Router, Response } from "express";
import { authenticate, authorizeAdmin, AuthRequest } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";

const router = Router();

// Middleware to ensure admin for all routes here
router.use(authenticate, authorizeAdmin);

// GET /admin/deposits
router.get("/deposits", async (req: AuthRequest, res: Response) => {
  try {
    const deposits = await prisma.depositRequest.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deposits" });
  }
});

// POST /admin/deposits/:id/verify
router.post("/deposits/:id/verify", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const deposit = await prisma.depositRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!deposit || deposit.status !== "pending") {
      return res.status(400).json({ error: "Deposit not found or already processed" });
    }

    // ATOMIC TRANSACTION: Update deposit status + Increase balance + Create transaction record
    const result = await prisma.$transaction(async (tx) => {
      await tx.depositRequest.update({
        where: { id },
        data: {
          status: "verified",
          verifiedAt: new Date()
        }
      });

      await tx.wallet.update({
        where: { userId: deposit.userId },
        data: {
          balance: { increment: deposit.amount }
        }
      });

      return tx.transaction.create({
        data: {
          userId: deposit.userId,
          type: "deposit",
          currency: "USDT",
          amount: deposit.amount,
          status: "completed",
          referenceId: deposit.id
        }
      });
    });

    res.json(result);
  } catch (error) {
    console.error("Deposit verify error:", error);
    res.status(500).json({ error: "Failed to verify deposit" });
  }
});

// POST /admin/deposits/:id/reject
router.post("/deposits/:id/reject", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const deposit = await prisma.depositRequest.update({
      where: { id },
      data: { status: "rejected" }
    });
    res.json(deposit);
  } catch (error) {
    res.status(500).json({ error: "Failed to reject deposit" });
  }
});

// GET /admin/withdrawals
router.get("/withdrawals", async (req: AuthRequest, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawalRequest.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

// POST /admin/withdrawals/:id/pay
router.post("/withdrawals/:id/pay", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // ATOMIC TRANSACTION: Check status + Update status + Deduct balance + Create transaction record
    const result = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id },
        include: { user: { include: { wallet: true } } }
      });

      if (!withdrawal) throw new Error("Withdrawal not found");
      if (withdrawal.status !== "pending") throw new Error("Withdrawal already processed");

      const amountToDeduct = withdrawal.amount; // USDT amount

      if (!withdrawal.user.wallet || withdrawal.user.wallet.balance < amountToDeduct) {
        throw new Error("User has insufficient USDT balance");
      }

      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: "paid",
          processedAt: new Date()
        }
      });

      await tx.wallet.update({
        where: { userId: withdrawal.userId },
        data: {
          balance: { decrement: amountToDeduct }
        }
      });

      return tx.transaction.updateMany({
        where: { referenceId: withdrawal.id },
        data: { status: "completed" }
      });
    });

    res.json(result);
  } catch (error: any) {
    console.error("Withdrawal pay error:", error);
    res.status(400).json({ error: error.message || "Failed to process withdrawal" });
  }
});

// GET /admin/users - List all users with balances
router.get("/users", async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { 
        wallet: true,
        merchant: true,
        _count: { select: { depositRequests: true, withdrawalRequests: true, p2pOrders: true } }
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /admin/users/:id/freeze
router.post("/users/:id/freeze", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { frozen } = req.body; // boolean

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isFrozen: frozen }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: frozen ? "USER_FROZEN" : "USER_UNFROZEN",
        details: JSON.stringify({ targetUserId: id })
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to freeze/unfreeze user" });
  }
});

// GET /admin/orders - All P2P orders
router.get("/orders", async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.p2POrder.findMany({
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

// GET /admin/logs - System audit logs
router.get("/logs", async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// POST /admin/orders/:id/resolve
router.post("/orders/:id/resolve", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { action } = req.body; // "RELEASE" or "CANCEL"
  const adminId = req.user!.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.p2POrder.findUnique({
        where: { id },
        include: { merchant: true }
      });

      if (!order) throw new Error("Order not found");
      if (order.status !== "DISPUTED" && order.status !== "PAID" && order.status !== "PENDING") {
         // Admin can resolve mostly anything in trouble
      }

      if (action === "RELEASE") {
        // Same logic as release in p2p.ts
        await tx.p2POrder.update({
          where: { id },
          data: { status: "COMPLETED", completedAt: new Date() }
        });

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
      } else if (action === "CANCEL") {
        // Same logic as cancel in p2p.ts
        await tx.p2POrder.update({
          where: { id },
          data: { status: "CANCELLED" }
        });

        if (order.type === "BUY") {
          await tx.wallet.update({
            where: { userId: order.creatorId },
            data: { 
              balance: { increment: order.amountUsdt },
              lockedBalance: { decrement: order.amountUsdt }
            }
          });
        }
        
        // Return liquidity to ad
        const ad = await tx.p2PAd.findUnique({ where: { id: order.adId } });
        if (ad) {
          await tx.p2PAd.update({
            where: { id: order.adId },
            data: { 
              remainingAmount: { increment: order.amountUsdt },
              status: ad.status === "EXPIRED" ? "ACTIVE" : ad.status
            }
          });
        }
      }

      return tx.auditLog.create({
        data: {
          userId: adminId,
          action: `ADMIN_ORDER_${action}`,
          details: JSON.stringify({ orderId: id, action })
        }
      });
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /admin/merchants/:id/approve
router.post("/merchants/:id/approve", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // APPROVED, REJECTED, SUSPENDED
  try {
    const merchant = await prisma.merchant.update({
      where: { id },
      data: { status }
    });
    
    // Synchronize to the associated User profile immediately
    if (status === "APPROVED") {
      await prisma.user.update({
        where: { id: merchant.userId },
        data: {
          accountType: "merchant",
          verificationStatus: "verified"
        }
      });
    } else {
      await prisma.user.update({
        where: { id: merchant.userId },
        data: {
          accountType: "user",
          verificationStatus: status === "PENDING" ? "pending" : "unverified"
        }
      });
    }

    // If suspended, we might want to deactivate their ads
    if (status === "SUSPENDED") {
      await prisma.p2PAd.updateMany({
        where: { merchantId: id, status: "ACTIVE" },
        data: { status: "INACTIVE" }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: `MERCHANT_${status}`,
        details: JSON.stringify({ merchantId: id, targetUserId: merchant.userId })
      }
    });

    res.json(merchant);
  } catch (error) {
    res.status(500).json({ error: "Failed to update merchant" });
  }
});

// GET /admin/merchants - List all merchants
router.get("/merchants", async (req: AuthRequest, res: Response) => {
  try {
    const merchants = await prisma.merchant.findMany({
      include: { user: true, _count: { select: { ads: true, p2pOrders: true } } }
    });
    res.json(merchants);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch merchants" });
  }
});

// POST /admin/withdrawals/:id/reject
router.post("/withdrawals/:id/reject", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.update({
        where: { id },
        data: { status: "rejected" }
      });

      await tx.transaction.updateMany({
        where: { referenceId: withdrawal.id },
        data: { status: "rejected" }
      });

      return withdrawal;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to reject withdrawal" });
  }
});

// POST /admin/settings
router.post("/settings", async (req: AuthRequest, res: Response) => {
  const { buyRate, sellRate } = req.body;

  try {
    const settings = await prisma.globalSetting.upsert({
      where: { id: "singleton" },
      update: {
        buyRate: parseFloat(buyRate),
        sellRate: parseFloat(sellRate),
        updatedAt: new Date()
      },
      create: {
        id: "singleton",
        buyRate: parseFloat(buyRate),
        sellRate: parseFloat(sellRate)
      }
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// GET /admin/ads - All P2P ads
router.get("/ads", async (req: AuthRequest, res: Response) => {
  try {
    const ads = await prisma.p2PAd.findMany({
      include: { merchant: { include: { user: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(ads);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ads" });
  }
});

export default router;
