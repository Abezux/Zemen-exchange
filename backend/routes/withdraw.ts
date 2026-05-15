import { Router, Response } from "express";
import { authenticate, AuthRequest, checkNotFrozen } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";

const router = Router();

// GET /withdraw/history
router.get("/history", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const history = await prisma.withdrawalRequest.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch withdrawal history" });
  }
});

// POST /withdraw/usdt
router.post("/usdt", authenticate, checkNotFrozen, async (req: AuthRequest, res: Response) => {
  const { amount, network, recipientAddress, fee, willReceive } = req.body;

  if (!amount || !recipientAddress || !network) {
    return res.status(400).json({ error: "amount, network and recipientAddress are required" });
  }

  const usdtAmount = parseFloat(amount);

  try {
    // 1. Check USDT balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.id }
    });

    if (!wallet || wallet.balance < usdtAmount) {
      return res.status(400).json({ error: `Insufficient balance. You need ${usdtAmount.toFixed(2)} USDT for this withdrawal.` });
    }

    // 2. Get current rates to store optional ETB value
    const settings = await prisma.globalSetting.findUnique({
      where: { id: "singleton" }
    });

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId: req.user!.id,
        amount: usdtAmount,
        walletAddress: recipientAddress,
        network,
        fee: parseFloat(fee) || 0,
        amountEtb: settings ? usdtAmount * settings.sellRate : 0,
        status: "pending"
      }
    });

    // Create a pending transaction record for the activity feed
    await prisma.transaction.create({
      data: {
        userId: req.user!.id,
        type: "withdrawal",
        currency: "USDT",
        amount: usdtAmount,
        status: "pending",
        referenceId: withdrawal.id
      }
    });

    res.json(withdrawal);
  } catch (error) {
    console.error("Withdrawal request error:", error);
    res.status(500).json({ error: "Failed to request withdrawal" });
  }
});

export default router;
