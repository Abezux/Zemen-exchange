import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";
import multer from "multer";

const router = Router();

// Setup multer for memory storage
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

// POST /api/upload
router.post("/", authenticate, upload.single("image"), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const attachment = await prisma.attachment.create({
      data: {
        content: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });

    res.json({
      id: attachment.id,
      url: `/uploads/${attachment.id}`, // Custom URL for retrieval
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to save image to database" });
  }
});

// GET /uploads/:id (Retrieval endpoint)
// Note: This is usually registered at the app level but we can define the logic here
export const getAttachment = async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return res.status(404).send("Image not found");
    }

    res.setHeader("Content-Type", attachment.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    res.send(attachment.content);
  } catch (error) {
    console.error("Retrieval error:", error);
    res.status(500).send("Internal server error");
  }
};

export default router;
