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
    const contentType = req.file.mimetype || "image/jpeg";

    const attachment = await prisma.attachment.create({
      data: {
        content: req.file.buffer,
        contentType,
      },
    });

    res.json({
      id: attachment.id,
      url: `/uploads/${attachment.id}`,
      contentType,
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

// Debug endpoint to test attachment retrieval
router.get("/:id/debug", async (req: any, res: any) => {
  const { id } = req.params;

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      select: {
        id: true,
        contentType: true,
        createdAt: true,
        content: true
      }
    });

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    res.json({
      id: attachment.id,
      contentType: attachment.contentType,
      createdAt: attachment.createdAt,
      contentLength: attachment.content ? attachment.content.length : 0,
      contentSize: attachment.content ? `${(attachment.content.length / 1024).toFixed(2)} KB` : "0 KB",
      canServe: !!(attachment.content && attachment.content.length > 0)
    });
  } catch (error: any) {
    res.status(500).json({ error: "Debug failed", details: error.message });
  }
});

// Test endpoint: Serve attachment directly without auth
router.get("/:id/test", async (req: any, res: any) => {
  const { id } = req.params;

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    if (!attachment.content || attachment.content.length === 0) {
      return res.status(500).json({ error: "Content is empty" });
    }

    const contentType = attachment.contentType || "image/jpeg";
    console.log(`[UPLOAD-TEST] Serving attachment ${id} (${attachment.content.length} bytes, type: ${contentType})`);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("Content-Length", attachment.content.length);
    res.send(attachment.content);
  } catch (error: any) {
    console.error(`[UPLOAD-TEST] Error:`, error);
    res.status(500).json({ error: "Failed to retrieve", details: error.message });
  }
});

export default router;
