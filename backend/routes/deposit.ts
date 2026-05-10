import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Setup multer for proof image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./public/uploads";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
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

    const deposit = await prisma.depositRequest.create({
      data: {
        userId: req.user!.id,
        amount: parseFloat(amount),
        network: network || "TRC20",
        txHash,
        proofImageUrl: req.file ? `/uploads/${req.file.filename}` : null,
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
