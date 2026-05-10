import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.ts";

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123";

const ADMIN_EMAIL = "abenezerandualem81@gmail.com";

router.post("/google", async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: "Credential is required" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: "Invalid token payload" });
    }

    const { email, name, sub: googleId } = payload;

    let user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: true, merchant: true }
    });

    if (!user) {
      // Create user and initial wallet
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: email === ADMIN_EMAIL ? "ADMIN" : "USER",
          wallet: {
            create: {
              balance: 0,
            }
          }
        },
        include: { wallet: true, merchant: true }
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,           // Must be true for sameSite: 'none'
      sameSite: "none",       // Required for cross-site/iframe cookies
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user, token });
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ message: "Logged out" });
});

export default router;
