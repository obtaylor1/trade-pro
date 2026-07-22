import type { Express } from "express";
import { createHash, randomBytes, randomUUID } from "crypto";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { betaFeedback, betaInvites, expertStrategies, orders, platformControls, reconciliationEvents, safetyEvents, userNotifications } from "@shared/schema";
import { authMiddleware, authed, requireAdmin } from "./middleware";
import { getPlatformControls } from "../orderSafetyService";
import { writeAdminAudit } from "../adminSecurity";
import { getBrokerAdapter } from "../broker";

const hashCode = (code: string) => createHash("sha256").update(code.trim().toUpperCase()).digest("hex");

export async function consumeBetaInvite(code: string) {
  const codeHash = hashCode(code);
  return db.transaction(async (tx: any) => {
    const [invite] = await tx.select().from(betaInvites).where(and(eq(betaInvites.codeHash, codeHash), eq(betaInvites.active, true))).limit(1);
    if (!invite || invite.usedCount >= invite.maxUses || (invite.expiresAt && invite.expiresAt < new Date())) return false;
    await tx.update(betaInvites).set({ usedCount: sql`${betaInvites.usedCount} + 1` }).where(eq(betaInvites.id, invite.id));
    return true;
  });
}

export function registerOperationsRoutes(app: Express) {
  app.get("/api/operations/controls", authMiddleware, requireAdmin, async (_req, res) => res.json(await getPlatformControls()));
  app.patch("/api/operations/controls", authMiddleware, requireAdmin, authed(async (req, res) => {
    const body = z.object({ globalTradingPaused: z.boolean().optional(), paperBetaInviteOnly: z.boolean().optional() }).parse(req.body);
    const [updated] = await db.update(platformControls).set({ ...body, updatedBy: req.userId, updatedAt: new Date() }).where(eq(platformControls.id, "global")).returning();
    await writeAdminAudit(req, req.userId, "platform_controls_updated", "Owner updated platform safety controls.", { metadata: body });
    res.json(updated);
  }));
  app.get("/api/operations/safety-events", authMiddleware, requireAdmin, async (_req, res) => res.json(await db.select().from(safetyEvents).orderBy(desc(safetyEvents.createdAt)).limit(100)));
  app.get("/api/operations/beta-invites", authMiddleware, requireAdmin, async (_req, res) => res.json(await db.select({ id: betaInvites.id, label: betaInvites.label, maxUses: betaInvites.maxUses, usedCount: betaInvites.usedCount, active: betaInvites.active, expiresAt: betaInvites.expiresAt, createdAt: betaInvites.createdAt }).from(betaInvites).orderBy(desc(betaInvites.createdAt))));
  app.post("/api/operations/beta-invites", authMiddleware, requireAdmin, authed(async (req, res) => {
    const body = z.object({ label: z.string().min(2).max(80), maxUses: z.coerce.number().int().min(1).max(100).default(1), expiresInDays: z.coerce.number().int().min(1).max(365).default(30) }).parse(req.body);
    const code = `TP-${randomBytes(4).toString("hex").toUpperCase()}`;
    const expiresAt = new Date(Date.now() + body.expiresInDays * 86400000);
    const [invite] = await db.insert(betaInvites).values({ id: randomUUID(), codeHash: hashCode(code), label: body.label, maxUses: body.maxUses, usedCount: 0, active: true, expiresAt, createdBy: req.userId, createdAt: new Date() }).returning();
    await writeAdminAudit(req, req.userId, "beta_invite_created", `Owner created beta invite “${body.label}”.`, { targetType: "beta_invite", targetId: invite.id });
    res.json({ ...invite, code });
  }));
  app.post("/api/operations/reconcile", authMiddleware, requireAdmin, authed(async (req, res) => {
    const pending = await db.select().from(orders).where(and(eq(orders.mode, "live"), lt(orders.createdAt, new Date()))).orderBy(desc(orders.createdAt)).limit(100);
    let matched = 0, exceptions = 0;
    for (const order of pending) {
      try {
        const brokerOrder = await getBrokerAdapter(order.brokerName).getOrderStatus(order.id);
        const brokerStatus = brokerOrder?.status ?? "missing";
        const status = brokerStatus === order.status ? "matched" : "exception";
        status === "matched" ? matched++ : exceptions++;
        await db.insert(reconciliationEvents).values({ id: randomUUID(), orderId: order.id, userId: order.userId, brokerName: order.brokerName, status, localStatus: order.status, brokerStatus, message: status === "matched" ? "Local and broker records match." : "Local and broker order states differ.", checkedAt: new Date() });
      } catch { exceptions++; await db.insert(reconciliationEvents).values({ id: randomUUID(), orderId: order.id, userId: order.userId, brokerName: order.brokerName, status: "error", localStatus: order.status, brokerStatus: null, message: "Broker status could not be retrieved.", checkedAt: new Date() }); }
    }
    await writeAdminAudit(req, req.userId, "broker_reconciliation_run", `Owner reconciled ${pending.length} broker orders.`, { metadata: { matched, exceptions } });
    res.json({ checked: pending.length, matched, exceptions });
  }));
  app.get("/api/operations/reconciliation", authMiddleware, requireAdmin, async (_req, res) => res.json(await db.select().from(reconciliationEvents).orderBy(desc(reconciliationEvents.checkedAt)).limit(100)));

  app.get("/api/strategies", authMiddleware, async (_req, res) => res.json(await db.select().from(expertStrategies).where(eq(expertStrategies.active, true)).orderBy(desc(expertStrategies.updatedAt))));
  app.post("/api/operations/strategies", authMiddleware, requireAdmin, authed(async (req, res) => {
    const body = z.object({ name: z.string().min(2).max(100), description: z.string().min(10).max(1000), sourceName: z.string().min(2).max(100), sourceUrl: z.string().url().optional(), riskLevel: z.enum(["low", "medium", "high"]), disclosureDelay: z.string().min(2).max(200), allocations: z.array(z.object({ symbol: z.string().min(1).max(20), weight: z.number().min(1).max(100) })).min(1), active: z.boolean().default(false) }).parse(req.body);
    const [strategy] = await db.insert(expertStrategies).values({ id: randomUUID(), ...body, sourceUrl: body.sourceUrl ?? null, createdAt: new Date(), updatedAt: new Date() }).returning();
    await writeAdminAudit(req, req.userId, "strategy_created", `Owner created strategy “${strategy.name}”.`, { targetType: "strategy", targetId: strategy.id });
    res.json(strategy);
  }));
  app.post("/api/beta/feedback", authMiddleware, authed(async (req, res) => {
    const body = z.object({ category: z.enum(["bug", "idea", "confusing", "other"]), message: z.string().min(5).max(2000), page: z.string().max(200).optional() }).parse(req.body);
    const [feedback] = await db.insert(betaFeedback).values({ id: randomUUID(), userId: req.userId, ...body, page: body.page ?? null, status: "new", createdAt: new Date() }).returning();
    res.json(feedback);
  }));
  app.get("/api/operations/beta-feedback", authMiddleware, requireAdmin, async (_req, res) => res.json(await db.select().from(betaFeedback).orderBy(desc(betaFeedback.createdAt)).limit(100)));

  app.get("/api/notifications", authMiddleware, authed(async (req, res) => res.json(await db.select().from(userNotifications).where(eq(userNotifications.userId, req.userId)).orderBy(desc(userNotifications.createdAt)).limit(50))));
  app.post("/api/notifications/:id/read", authMiddleware, authed(async (req, res) => { await db.update(userNotifications).set({ read: true }).where(and(eq(userNotifications.id, req.params.id), eq(userNotifications.userId, req.userId))); res.json({ success: true }); }));
}
