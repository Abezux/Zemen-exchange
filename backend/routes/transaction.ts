import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";

const router = Router();

router.get("/transactions", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

export default router;
