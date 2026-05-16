import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";
import multer from "multer";
import { uploadToCloudinary } from "../lib/cloudinary.ts";

const router = Router();

// Setup multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG, PNG and WEBP images are allowed') as any, false);
      }
    }
});

// GET /deposit/history
router.get("/history", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const history = await prisma.depositRequest.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deposit history" });
  }
});

// POST /deposit/submit
router.post("/submit", authenticate, upload.single("proof"), async (req: AuthRequest, res: Response) => {
  const { txHash, amount, network } = req.body;

  if (!txHash || !amount) {
    return res.status(400).json({ error: "txHash and amount are required" });
  }

  try {
    // Check for duplicate txHash
    const existing = await prisma.depositRequest.findUnique({
      where: { txHash }
    });

    if (existing) {
      return res.status(400).json({ error: "Transaction hash already submitted" });
    }

    let proofImageUrl = null;
    if (req.file) {
      try {
        proofImageUrl = await uploadToCloudinary(req.file.buffer, 'deposits');
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError);
        return res.status(500).json({ error: "Failed to upload image to storage" });
      }
    }

    const deposit = await prisma.depositRequest.create({
      data: {
        userId: req.user!.id,
        amount: parseFloat(amount),
        network: network || "TRC20",
        txHash,
        proofImageUrl,
        status: "pending"
      }
    });

    res.json(deposit);
  } catch (error) {
    console.error("Deposit submit error:", error);
    res.status(500).json({ error: "Failed to submit deposit" });
  }
});

export default router;
