import type { Express } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "../storage";
import { STARTING_BALANCE } from "../config";
import { signupSchema, loginSchema, onboardingSchema } from "@shared/schema";
import { authMiddleware, authed, makeToken, userPayload, rateLimit } from "./middleware";

export function registerAuthRoutes(app: Express) {
  // 20 attempts per 5 minutes per IP across the credential endpoints.
  const authLimiter = rateLimit(20, 5 * 60_000);

  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    try {
      const body = signupSchema.parse(req.body);
      const existing = await storage.getUserByEmail(body.email);
      if (existing) return res.status(409).json({ message: "Email already registered" });
      const passwordHash = await bcrypt.hash(body.password, 10);
      const user = await storage.createUser({
        name: body.name,
        email: body.email,
        passwordHash,
        paperBalance: String(STARTING_BALANCE),
        onboardingComplete: false,
        marketInterests: [],
      });
      await storage.saveSnapshot(user.id, STARTING_BALANCE);
      await storage.updateLastLogin(user.id);
      const token = makeToken(user.id, user.isAdmin === 1, "30d");
      res.json({ token, user: userPayload(user) });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const body = loginSchema.parse(req.body);
      const rememberMe = req.body.rememberMe === true;
      const user = await storage.getUserByEmail(body.email);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });
      const ok = await bcrypt.compare(body.password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Invalid email or password" });
      await storage.updateLastLogin(user.id);
      const expiry = rememberMe ? "90d" : "30d";
      const token = makeToken(user.id, user.isAdmin === 1, expiry);
      res.json({ token, user: userPayload(user) });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/refresh", authMiddleware, authed(async (req, res) => {
    try {
      const user = await storage.getUserById(req.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const rememberMe = req.body?.rememberMe === true;
      const expiry = rememberMe ? "90d" : "30d";
      const token = makeToken(user.id, user.isAdmin === 1, expiry);
      res.json({ token, user: userPayload(user) });
    } catch {
      res.status(500).json({ message: "Refresh failed" });
    }
  }));

  app.post("/api/auth/demo", authLimiter, async (_req, res) => {
    try {
      const DEMO_EMAIL = "demo@tradepro.app";
      let user = await storage.getUserByEmail(DEMO_EMAIL);
      if (!user) {
        const passwordHash = await bcrypt.hash("demo-tradepro-2026", 10);
        user = await storage.createUser({
          name: "Demo Trader",
          email: DEMO_EMAIL,
          passwordHash,
          paperBalance: String(STARTING_BALANCE),
          onboardingComplete: true,
          marketInterests: ["stocks", "crypto", "forex", "commodities", "options"],
        });
        await storage.saveSnapshot(user.id, STARTING_BALANCE);
      }
      await storage.updateLastLogin(user.id);
      const token = makeToken(user.id, false, "30d");
      res.json({ token, user: userPayload(user) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Demo login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, authed(async (req, res) => {
    const user = await storage.getUserById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(userPayload(user));
  }));

  app.post("/api/onboarding", authMiddleware, authed(async (req, res) => {
    try {
      const body = onboardingSchema.parse(req.body);
      await storage.updateUserOnboarding(req.userId, body.marketInterests, body.paperBalance);
      await storage.saveSnapshot(req.userId, body.paperBalance);
      res.json({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      res.status(500).json({ message: "Onboarding failed" });
    }
  }));
}
