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
      console.log(`[UPLOAD] Attachment not found: ${id}`);
      return res.status(404).send("Image not found");
    }

    if (!attachment.content || attachment.content.length === 0) {
      console.error(`[UPLOAD] Attachment content is empty: ${id}`);
      return res.status(500).send("Image content is empty");
    }

    const contentType = attachment.contentType || "image/jpeg";
    console.log(`[UPLOAD] Serving attachment ${id} (${attachment.content.length} bytes, type: ${contentType})`);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    res.setHeader("Content-Length", attachment.content.length);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(attachment.content);
  } catch (error) {
    console.error(`[UPLOAD] Retrieval error for ${id}:`, error);
    res.status(500).send("Internal server error");
  }
};

// GET /uploads/:id/debug - Debug endpoint added to server.ts
// GET /uploads/:id/test - Test endpoint added to server.ts

export default router;
