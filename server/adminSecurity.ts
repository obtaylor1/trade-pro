import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { db } from "./db";
import { adminAuditLogs } from "@shared/schema";
import { ENCRYPTION_KEY } from "./config";
import type { Request } from "express";

const key = createHash("sha256").update(`${ENCRYPTION_KEY}:admin-mfa`).digest();

export function encryptMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptMfaSecret(payload: string) {
  const [iv, tag, encrypted] = payload.split(".").map(value => Buffer.from(value, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function createRecoveryCodes() {
  return Array.from({ length: 8 }, () => randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-"));
}

export function hashRecoveryCode(code: string) {
  return createHash("sha256").update(code.replace(/\s/g, "").toUpperCase()).digest("hex");
}

export async function writeAdminAudit(req: Request, adminUserId: string | null, action: string, summary: string, details: { targetType?: string; targetId?: string; metadata?: unknown } = {}) {
  await db.insert(adminAuditLogs).values({
    id: randomUUID(), adminUserId, action, summary,
    targetType: details.targetType ?? null, targetId: details.targetId ?? null,
    metadata: details.metadata, ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent")?.slice(0, 500) ?? null, createdAt: new Date(),
  });
}
