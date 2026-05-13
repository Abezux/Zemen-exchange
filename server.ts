import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";

// Routes
import authRoutes from "./backend/routes/auth.ts";
import userRoutes from "./backend/routes/user.ts";
import depositRoutes from "./backend/routes/deposit.ts";
import withdrawRoutes from "./backend/routes/withdraw.ts";
import adminRoutes from "./backend/routes/admin.ts";
import transactionRoutes from "./backend/routes/transaction.ts";
import p2pRoutes from "./backend/routes/p2p.ts";
import uploadRoutes, { getAttachment } from "./backend/routes/upload.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "https://zemenexchange.vercel.app",
    "https://zemen-exchange.onrender.com"
  ].filter(origin => Boolean(origin)) as string[];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some(allowed => origin === allowed || (allowed.endsWith("/") && origin === allowed.slice(0, -1)));
      
      if (isAllowed || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        console.error(`CORS blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Trust proxy for secure cookies on Render
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  //To see what's happening when you click sign-in,
  app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
  });

  // DB-based image retrieval
  app.get("/uploads/:id", getAttachment);

  // Debug endpoints for image troubleshooting
  app.get("/uploads/:id/debug", async (req, res) => {
    const { id } = req.params;
    try {
      const attachment = await (await import("./backend/lib/prisma.ts")).default.attachment.findUnique({
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

  app.get("/uploads/:id/test", async (req, res) => {
    const { id } = req.params;
    try {
      const prisma = (await import("./backend/lib/prisma.ts")).default;
      const attachment = await prisma.attachment.findUnique({ where: { id } });

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

  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/deposit", depositRoutes);
  app.use("/api/withdraw", withdrawRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/p2p", p2pRoutes);
  app.use("/api/upload", uploadRoutes);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "API server is running" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
