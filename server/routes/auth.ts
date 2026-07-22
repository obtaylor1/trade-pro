import type { Express } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "../storage";
import { STARTING_BALANCE } from "../config";
import { signupSchema, loginSchema, onboardingSchema } from "@shared/schema";
import { authMiddleware, authed, makeToken, userPayload, rateLimit } from "./middleware";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { db } from "../db";
import { adminMfa } from "@shared/schema";
import { eq } from "drizzle-orm";
import { JWT_SECRET } from "../config";
import { createRecoveryCodes, decryptMfaSecret, encryptMfaSecret, hashRecoveryCode, writeAdminAudit } from "../adminSecurity";
import { consumeBetaInvite } from "./operations";
import { getPlatformControls } from "../orderSafetyService";

export function registerAuthRoutes(app: Express) {
  // 20 attempts per 5 minutes per IP across the credential endpoints.
  const authLimiter = rateLimit(20, 5 * 60_000);

  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    try {
      const body = signupSchema.parse(req.body);
      const controls = await getPlatformControls();
      if (controls.paperBetaInviteOnly) {
        const inviteCode = z.string().min(4).safeParse(req.body?.inviteCode);
        if (!inviteCode.success || !(await consumeBetaInvite(inviteCode.data))) return res.status(403).json({ message: "A valid beta invitation is required" });
      }
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

  app.post("/api/auth/admin-login", authLimiter, async (req, res) => {
    try {
      const body = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(body.email);
      // Keep this response intentionally identical for unknown, non-admin,
      // and incorrect-password attempts so the owner account cannot be found
      // by probing the endpoint.
      if (!user || user.isAdmin !== 1) return res.status(401).json({ message: "Owner email or password is incorrect" });
      const ok = await bcrypt.compare(body.password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Owner email or password is incorrect" });
      await storage.updateLastLogin(user.id);
      const [mfa] = await db.select().from(adminMfa).where(eq(adminMfa.userId, user.id)).limit(1);
      if (mfa?.enabled) {
        await writeAdminAudit(req, user.id, "admin_password_verified", "Owner password verified; two-factor challenge issued.");
        return res.json({ requiresMfa: true, challengeToken: makeToken(user.id, true, "5m", { mfaPending: true }) });
      }
      const token = makeToken(user.id, true, "8h");
      await writeAdminAudit(req, user.id, "admin_login", "Owner signed in without two-factor; setup is still required.");
      res.json({ token, user: userPayload(user), mfaSetupRequired: true });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      res.status(500).json({ message: "Owner sign-in failed" });
    }
  });

  app.post("/api/auth/admin-login/mfa", authLimiter, async (req, res) => {
    try {
      const parsed = z.object({ challengeToken: z.string().min(20), code: z.string().min(6).max(20) }).parse(req.body);
      const payload = jwt.verify(parsed.challengeToken, JWT_SECRET) as { userId: string; isAdmin: boolean; mfaPending?: boolean };
      if (!payload.isAdmin || !payload.mfaPending) return res.status(401).json({ message: "This owner sign-in has expired" });
      const user = await storage.getUserById(payload.userId);
      const [mfa] = await db.select().from(adminMfa).where(eq(adminMfa.userId, payload.userId)).limit(1);
      if (!user || user.isAdmin !== 1 || !mfa?.enabled) return res.status(401).json({ message: "Two-factor verification failed" });
      const normalized = parsed.code.replace(/\s/g, "").toUpperCase();
      const totp = new OTPAuth.TOTP({ issuer: "Trade Pro", label: user.email, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(decryptMfaSecret(mfa.encryptedSecret)) });
      const validTotp = totp.validate({ token: normalized, window: 1 }) !== null;
      const recoveryHash = hashRecoveryCode(normalized);
      const recoveryIndex = mfa.recoveryCodeHashes.indexOf(recoveryHash);
      if (!validTotp && recoveryIndex < 0) {
        await writeAdminAudit(req, user.id, "admin_mfa_failed", "An invalid owner two-factor code was submitted.");
        return res.status(401).json({ message: "The security code is incorrect" });
      }
      if (recoveryIndex >= 0) {
        await db.update(adminMfa).set({ recoveryCodeHashes: mfa.recoveryCodeHashes.filter((_hash: string, index: number) => index !== recoveryIndex), updatedAt: new Date() }).where(eq(adminMfa.id, mfa.id));
      }
      await writeAdminAudit(req, user.id, "admin_login", recoveryIndex >= 0 ? "Owner signed in with a recovery code." : "Owner completed two-factor sign-in.");
      res.json({ token: makeToken(user.id, true, "8h"), user: userPayload(user) });
    } catch {
      res.status(401).json({ message: "This owner sign-in has expired" });
    }
  });

  app.get("/api/auth/admin-mfa/status", authMiddleware, authed(async (req, res) => {
    if (!req.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const [mfa] = await db.select().from(adminMfa).where(eq(adminMfa.userId, req.userId)).limit(1);
    res.json({ enabled: mfa?.enabled ?? false, confirmedAt: mfa?.confirmedAt ?? null, recoveryCodesRemaining: mfa?.recoveryCodeHashes.length ?? 0 });
  }));

  app.post("/api/auth/admin-mfa/setup", authMiddleware, authed(async (req, res) => {
    if (!req.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const user = await storage.getUserById(req.userId);
    if (!user) return res.status(404).json({ message: "Owner not found" });
    const secret = new OTPAuth.Secret({ size: 20 });
    const recoveryCodes = createRecoveryCodes();
    const now = new Date();
    await db.insert(adminMfa).values({ id: randomUUID(), userId: req.userId, encryptedSecret: encryptMfaSecret(secret.base32), recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode), enabled: false, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: adminMfa.userId, set: { encryptedSecret: encryptMfaSecret(secret.base32), recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode), enabled: false, confirmedAt: null, updatedAt: now } });
    const totp = new OTPAuth.TOTP({ issuer: "Trade Pro", label: user.email, algorithm: "SHA1", digits: 6, period: 30, secret });
    await writeAdminAudit(req, req.userId, "admin_mfa_setup_started", "Owner started authenticator setup.");
    res.json({ qrDataUrl: await QRCode.toDataURL(totp.toString(), { margin: 1, width: 240 }), manualKey: secret.base32, recoveryCodes });
  }));

  app.post("/api/auth/admin-mfa/confirm", authMiddleware, authed(async (req, res) => {
    if (!req.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const code = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body).code;
    const [mfa] = await db.select().from(adminMfa).where(eq(adminMfa.userId, req.userId)).limit(1);
    if (!mfa) return res.status(409).json({ message: "Start two-factor setup first" });
    const user = await storage.getUserById(req.userId);
    const totp = new OTPAuth.TOTP({ issuer: "Trade Pro", label: user?.email ?? "Owner", algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(decryptMfaSecret(mfa.encryptedSecret)) });
    if (totp.validate({ token: code, window: 1 }) === null) return res.status(400).json({ message: "That code did not match. Try the newest code." });
    const now = new Date();
    await db.update(adminMfa).set({ enabled: true, confirmedAt: now, updatedAt: now }).where(eq(adminMfa.id, mfa.id));
    await writeAdminAudit(req, req.userId, "admin_mfa_enabled", "Authenticator two-factor security was enabled.");
    res.json({ success: true });
  }));

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
