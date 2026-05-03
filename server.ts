import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";

// Routes
import authRoutes from "./src/backend/routes/auth.ts";
import userRoutes from "./src/backend/routes/user.ts";
import depositRoutes from "./src/backend/routes/deposit.ts";
import withdrawRoutes from "./src/backend/routes/withdraw.ts";
import adminRoutes from "./src/backend/routes/admin.ts";
import transactionRoutes from "./src/backend/routes/transaction.ts";
import p2pRoutes from "./src/backend/routes/p2p.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  //To see what's happening when you click sign-in,
  app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
  });
  // Static files for uploads
  app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/deposit", depositRoutes);
  app.use("/api/withdraw", withdrawRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/p2p", p2pRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
