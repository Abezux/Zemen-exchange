import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";

const router = Router();

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { wallet: true, merchant: true }
    });

    let settings = await prisma.globalSetting.findUnique({
      where: { id: "singleton" }
    });

    if (!settings) {
      settings = await prisma.globalSetting.create({
        data: { id: "singleton" }
      });
    }

    res.json({
      ...user,
      settings
    });
  } catch (error) {
    console.error("Me error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
