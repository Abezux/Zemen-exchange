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
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { user: { include: { wallet: true } } }
    });

    const settings = await prisma.globalSetting.findUnique({
      where: { id: "singleton" }
    });

    if (!withdrawal || withdrawal.status !== "pending" || !settings) {
      return res.status(400).json({ error: "Withdrawal not found, system error, or already processed" });
    }

    const usdtEquivalent = withdrawal.amountEtb / settings.sellRate;

    if (!withdrawal.user.wallet || withdrawal.user.wallet.balance < usdtEquivalent) {
      return res.status(400).json({ error: "User has insufficient USDT balance" });
    }

    // ATOMIC TRANSACTION: Update status + Deduct balance + Create transaction record
    const result = await prisma.$transaction(async (tx) => {
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
          balance: { decrement: usdtEquivalent }
        }
      });

      return tx.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: "withdrawal",
          currency: "USDT",
          amount: usdtEquivalent,
          status: "completed",
          referenceId: withdrawal.id
        }
      });
    });

    res.json(result);
  } catch (error) {
    console.error("Withdrawal pay error:", error);
    res.status(500).json({ error: "Failed to process withdrawal" });
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

// POST /admin/merchants/:id/approve
router.post("/merchants/:id/approve", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // APPROVED or REJECTED
  try {
    const merchant = await prisma.merchant.update({
      where: { id },
      data: { status }
    });
    
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

// POST /admin/withdrawals/:id/reject
router.post("/withdrawals/:id/reject", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const withdrawal = await prisma.withdrawalRequest.update({
      where: { id },
      data: { status: "rejected" }
    });
    res.json(withdrawal);
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

export default router;
