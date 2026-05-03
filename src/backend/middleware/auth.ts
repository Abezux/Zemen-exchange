import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  file?: any;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function authorizeAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    // Also allow hardcoded admin email just in case
    const adminEmail = "abenezerandualem81@gmail.com";
    if (req.user?.email === adminEmail) {
      return next();
    }
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
}
