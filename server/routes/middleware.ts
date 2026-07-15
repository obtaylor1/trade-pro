import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import type { User } from "@shared/schema";

export interface AuthedRequest extends Request {
  userId: string;
  isAdmin: boolean;
}

/** Express handler whose request has passed authMiddleware. */
export type AuthedHandler = (req: AuthedRequest, res: Response) => unknown | Promise<unknown>;

/** Adapts an AuthedHandler to Express's plain signature. */
export function authed(handler: AuthedHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req as AuthedRequest, res)).catch(next);
  };
}

export function makeToken(userId: string, isAdmin: boolean, expiresIn: string | number = "30d") {
  return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string; isAdmin?: boolean };
    (req as AuthedRequest).userId = payload.userId;
    (req as AuthedRequest).isAdmin = payload.isAdmin ?? false;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(req as AuthedRequest).isAdmin) return res.status(403).json({ message: "Forbidden" });
  next();
}

export function userPayload(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    paperBalance: user.paperBalance,
    onboardingComplete: user.onboardingComplete,
    marketInterests: user.marketInterests,
    isAdmin: user.isAdmin === 1,
  };
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

interface RateWindow {
  count: number;
  resetAt: number;
}

/**
 * Simple fixed-window in-memory rate limiter keyed by IP.
 * Suitable for a single-process deployment; swap for a store-backed
 * limiter if the app is ever scaled horizontally.
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const windows = new Map<string, RateWindow>();

  // Periodically drop expired windows so the map doesn't grow unbounded.
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of windows) {
      if (win.resetAt <= now) windows.delete(key);
    }
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const win = windows.get(key);
    if (!win || win.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    win.count += 1;
    if (win.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((win.resetAt - now) / 1000));
      return res.status(429).json({ message: "Too many attempts. Please try again shortly." });
    }
    next();
  };
}
