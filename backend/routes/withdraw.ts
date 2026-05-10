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

// POST /withdraw/request
router.post("/request", authenticate, checkNotFrozen, async (req: AuthRequest, res: Response) => {
  const { amountEtb, destination } = req.body;

  if (!amountEtb || !destination) {
    return res.status(400).json({ error: "amountEtb and destination are required" });
  }

  const amount = parseFloat(amountEtb);

  try {
    // 1. Get current rates
    const settings = await prisma.globalSetting.findUnique({
      where: { id: "singleton" }
    });
    
    if (!settings) {
      return res.status(500).json({ error: "System settings not configured" });
    }

    // 2. Calculate USDT equivalent
    const usdtNeeded = amount / settings.sellRate;

    // 3. Check USDT balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.id }
    });

    if (!wallet || wallet.balance < usdtNeeded) {
      return res.status(400).json({ error: `Insufficient balance. You need ${usdtNeeded.toFixed(2)} USDT for this withdrawal.` });
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId: req.user!.id,
        amountEtb: amount,
        destination,
        status: "pending"
      }
    });

    res.json(withdrawal);
  } catch (error) {
    console.error("Withdrawal request error:", error);
    res.status(500).json({ error: "Failed to request withdrawal" });
  }
});

export default router;
