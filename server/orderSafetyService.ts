import { randomUUID } from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { managedProfiles, orders, platformControls, safetyEvents, trades, userNotifications, users } from "@shared/schema";

export type OrderOrigin = "manual" | "ai_confirmed" | "ai_managed" | "recurring_investment";
export type SafetyInput = { userId: string; amount: number; assetClass: string; symbol?: string; origin: OrderOrigin; idempotencyKey?: string; executionMode: "paper" | "sandbox" | "live" };

async function reject(input: SafetyInput, rule: string, message: string): Promise<never> {
  await db.insert(safetyEvents).values({ id: randomUUID(), userId: input.userId, rule, severity: "blocked", message, metadata: input, createdAt: new Date() });
  await db.insert(userNotifications).values({ id: randomUUID(), userId: input.userId, type: "safety", title: "Trade stopped for safety", message, read: false, createdAt: new Date() });
  throw Object.assign(new Error(message), { statusCode: 409, safetyRule: rule });
}

export async function getPlatformControls() {
  const [existing] = await db.select().from(platformControls).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(platformControls).values({ id: "global", globalTradingPaused: false, paperBetaInviteOnly: false, liveTradingEnabled: false, liveTradingReason: "Broker approval and compliance review required", updatedAt: new Date() }).returning();
  return created;
}

export async function enforceOrderSafety(input: SafetyInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return reject(input, "invalid_amount", "Enter an amount greater than $0.");
  const controls = await getPlatformControls();
  if (controls.globalTradingPaused) return reject(input, "global_pause", "Trading is temporarily paused by Trade Pro for safety.");
  if (input.executionMode === "live" && !controls.liveTradingEnabled) return reject(input, "live_gate", controls.liveTradingReason);
  if (["options", "futures"].includes(input.assetClass)) return reject(input, "complex_asset", "Options and futures are not available in beginner mode.");
  if (input.executionMode === "live" && input.assetClass === "stocks") {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const value = (type: string) => parts.find(part => part.type === type)?.value ?? "";
    const minutes = Number(value("hour")) * 60 + Number(value("minute"));
    if (["Sat", "Sun"].includes(value("weekday")) || minutes < 570 || minutes >= 960) return reject(input, "market_closed", "The US stock market is closed. The order was not sent.");
  }
  if (input.idempotencyKey) {
    const [duplicate] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.userId, input.userId), eq(orders.idempotencyKey, input.idempotencyKey))).limit(1);
    if (duplicate) return reject(input, "duplicate_order", "This order was already sent. No second order was placed.");
  }
  if (input.origin !== "manual") {
    const [mandate] = await db.select().from(managedProfiles).where(eq(managedProfiles.userId, input.userId)).limit(1);
    if (!mandate) return reject(input, "missing_mandate", "Set your AI permission limits before automated trading.");
    if (mandate.emergencyPaused) return reject(input, "user_pause", "Your AI trading permission is paused.");
    if (mandate.mandateExpiresAt && mandate.mandateExpiresAt <= new Date()) return reject(input, "expired_mandate", "Your AI trading permission has expired. Review it before continuing.");
    if (!mandate.allowedMarkets.includes(input.assetClass)) return reject(input, "market_not_allowed", `Your AI is not allowed to trade ${input.assetClass}.`);
    if (input.amount > Number(mandate.maxOrderAmount)) return reject(input, "order_limit", `This is above your $${Number(mandate.maxOrderAmount).toFixed(0)} AI order limit.`);
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const [daily] = await db.select({ total: sql<string>`coalesce(sum(${orders.notionalAmount}), 0)` }).from(orders)
      .where(and(eq(orders.userId, input.userId), gte(orders.createdAt, since)));
    if (Number(daily.total) + input.amount > Number(mandate.maxDailyAmount)) return reject(input, "daily_limit", `This would pass your $${Number(mandate.maxDailyAmount).toFixed(0)} daily AI limit.`);
    const [losses] = await db.select({ total: sql<string>`coalesce(sum(case when ${trades.pnl}::numeric < 0 then abs(${trades.pnl}::numeric) else 0 end), 0)` }).from(trades)
      .where(and(eq(trades.userId, input.userId), gte(trades.exitAt, since)));
    if (Number(losses.total) >= Number(mandate.maxLossAmount)) return reject(input, "loss_limit", `AI trading is paused because you reached your $${Number(mandate.maxLossAmount).toFixed(0)} loss limit.`);
    if (input.symbol) {
      const [exposure] = await db.select({ total: sql<string>`coalesce(sum(${orders.notionalAmount}), 0)` }).from(orders).where(and(eq(orders.userId, input.userId), eq(orders.symbol, input.symbol)));
      const [user] = await db.select({ balance: users.paperBalance }).from(users).where(eq(users.id, input.userId)).limit(1);
      const portfolioBase = Math.max(Number(user?.balance ?? 0) + Number(daily.total), input.amount);
      if ((Number(exposure.total) + input.amount) / portfolioBase * 100 > mandate.maxPositionPercent) return reject(input, "position_limit", `${input.symbol} would become too large for your portfolio limit.`);
    }
    if (mandate.approvalMode === "explain_only") return reject(input, "explain_only", "Your AI can explain ideas, but it cannot place orders.");
    if (mandate.approvalMode === "confirm_each" && input.origin === "ai_managed") return reject(input, "confirmation_required", "Review and approve this AI trade first.");
  }
  return { allowed: true as const };
}
