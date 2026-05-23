import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";
import multer from "multer";
import { uploadToCloudinary } from "../lib/cloudinary.ts";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123";

const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG, PNG and WEBP images are allowed') as any, false);
      }
    }
});

// GET /api/user/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { 
        wallet: true, 
        merchant: true,
        paymentMethods: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (user && user.email === "abenezerandualem81@gmail.com" && user.role !== "ADMIN") {
      // Auto-update to ADMIN in DB
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
        include: {
          wallet: true,
          merchant: true,
          paymentMethods: {
            orderBy: { createdAt: "desc" }
          }
        }
      });

      // Update the user's JWT cookie with the new role
      const token = jwt.sign(
        { id: user.id, email: user.email, role: "ADMIN" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

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

// PATCH /api/user/profile
router.patch("/profile", authenticate, upload.single("avatar"), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, bio, avatarUrl, verificationStatus, accountType } = req.body;

    let finalAvatarUrl = avatarUrl;
    if (req.file) {
      finalAvatarUrl = await uploadToCloudinary(req.file.buffer, "avatars");
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (finalAvatarUrl !== undefined) updates.avatarUrl = finalAvatarUrl;
    if (verificationStatus !== undefined) updates.verificationStatus = verificationStatus;
    if (accountType !== undefined) {
      updates.accountType = accountType;
      // Mirror to User Role if needed
      if (accountType === "merchant") {
        updates.role = "USER"; // Keeps default role as USER, but upgrades accountType
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
      include: { wallet: true, merchant: true, paymentMethods: true }
    });

    // Mirror to merchant entry if role is upgraded to merchant
    if (accountType === "merchant") {
      const existingMerchant = await prisma.merchant.findUnique({ where: { userId } });
      if (!existingMerchant) {
        await prisma.merchant.create({
          data: {
            userId,
            businessName: name || updatedUser.email.split("@")[0],
            phoneNumber: "",
            bio: bio || "",
            status: "APPROVED" // Automatically approved for profile testing
          }
        });
      } else if (existingMerchant.status !== "APPROVED") {
        await prisma.merchant.update({
          where: { id: existingMerchant.id },
          data: { status: "APPROVED" }
        });
      }
    } else if (accountType === "user") {
      // Keep or disconnect merchant status if they downgrade
      const existingMerchant = await prisma.merchant.findUnique({ where: { userId } });
      if (existingMerchant) {
        await prisma.merchant.update({
          where: { id: existingMerchant.id },
          data: { status: "REJECTED" } // Soft downgrade in application logic
        });
      }
    }

    res.json(updatedUser);
  } catch (error: any) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
});

/**
 * Payment Methods CRUD & Settings
 */

// GET /api/user/payment-methods
router.get("/payment-methods", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const methods = await prisma.userPaymentMethod.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment methods" });
  }
});

// POST /api/user/payment-methods
router.post("/payment-methods", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { bankName, accountName, accountNumber, isDefault, isEnabled } = req.body;

    if (!bankName || !accountName || !accountNumber) {
      return res.status(400).json({ error: "Bank name, account name, and account number are required." });
    }

    const defaultState = isDefault === true || isDefault === "true";
    const enabledState = isEnabled !== false && isEnabled !== "false";

    await prisma.$transaction(async (tx) => {
      if (defaultState) {
        // Mark all others as non-default
        await tx.userPaymentMethod.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }

      // Check if this is the first payment method, if so make it default
      const count = await tx.userPaymentMethod.count({ where: { userId } });
      const finalIsDefault = count === 0 ? true : defaultState;

      await tx.userPaymentMethod.create({
        data: {
          userId,
          bankName,
          accountName,
          accountNumber,
          isDefault: finalIsDefault,
          isEnabled: enabledState
        }
      });
    });

    const refreshedList = await prisma.userPaymentMethod.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(refreshedList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create payment method" });
  }
});

// PUT /api/user/payment-methods/:id
router.put("/payment-methods/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { bankName, accountName, accountNumber, isDefault, isEnabled } = req.body;

    const existing = await prisma.userPaymentMethod.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Payment method not found." });
    }

    const defaultState = isDefault === true || isDefault === "true";
    const enabledState = isEnabled !== false && isEnabled !== "false";

    await prisma.$transaction(async (tx) => {
      if (defaultState) {
        // Mark all others as non-default
        await tx.userPaymentMethod.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }

      await tx.userPaymentMethod.update({
        where: { id },
        data: {
          bankName: bankName || existing.bankName,
          accountName: accountName || existing.accountName,
          accountNumber: accountNumber || existing.accountNumber,
          isDefault: defaultState,
          isEnabled: enabledState
        }
      });
    });

    const refreshedList = await prisma.userPaymentMethod.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(refreshedList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update payment method" });
  }
});

// DELETE /api/user/payment-methods/:id
router.delete("/payment-methods/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.userPaymentMethod.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Payment method not found." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userPaymentMethod.delete({
        where: { id }
      });

      // If we deleted the default one, make another one default
      if (existing.isDefault) {
        const remaining = await tx.userPaymentMethod.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
        if (remaining) {
          await tx.userPaymentMethod.update({
            where: { id: remaining.id },
            data: { isDefault: true }
          });
        }
      }
    });

    const refreshedList = await prisma.userPaymentMethod.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(refreshedList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete payment method" });
  }
});

// PATCH /api/user/payment-methods/:id/toggle
router.patch("/payment-methods/:id/toggle", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.userPaymentMethod.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Payment method not found." });
    }

    const updated = await prisma.userPaymentMethod.update({
      where: { id },
      data: { isEnabled: !existing.isEnabled }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to toggle status" });
  }
});

// POST /api/user/payment-methods/:id/default
router.post("/payment-methods/:id/default", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.userPaymentMethod.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Payment method not found." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userPaymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false }
      });

      await tx.userPaymentMethod.update({
        where: { id },
        data: { isDefault: true, isEnabled: true } // Ensuring it is enabled if default
      });
    });

    const refreshedList = await prisma.userPaymentMethod.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(refreshedList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to set default method" });
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
