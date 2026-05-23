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

// Get user notifications (up to 50 newest)
router.get("/notifications", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json(notifications);
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark single notification as read
router.patch("/notifications/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const notif = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notif) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json(updated);
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Mark all as read
router.post("/notifications/read-all", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

// Register FCM Push token for push notifications schema prep
router.post("/push-token", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const pushToken = await prisma.pushToken.upsert({
      where: { token },
      update: { userId },
      create: { token, userId }
    });

    res.json({ success: true, pushToken });
  } catch (error) {
    console.error("Register push token error:", error);
    res.status(500).json({ error: "Failed to register device token" });
  }
});

export default router;
