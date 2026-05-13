import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";
import multer from "multer";

const router = Router();

// Setup multer for proof image uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only images are allowed"));
      }
    },
});

// GET /deposit/history
router.get("/history", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const history = await prisma.depositRequest.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { proof: true }
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

    let proofId = null;
    if (req.file) {
      const attachment = await prisma.attachment.create({
        data: {
          content: req.file.buffer,
          contentType: req.file.mimetype,
        }
      });
      proofId = attachment.id;
    }

    const deposit = await prisma.depositRequest.create({
      data: {
        userId: req.user!.id,
        amount: parseFloat(amount),
        network: network || "TRC20",
        txHash,
        proofId,
        proofImageUrl: proofId ? `/uploads/${proofId}` : null,
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
