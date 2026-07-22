import { randomUUID } from "crypto";
import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "./db";
import { executePracticeOrder } from "./practiceOrderService";
import { managedActivities, managedPlans, managedProfiles } from "@shared/schema";

export type ManagedProfileInput = {
  goal: "grow_wealth" | "home" | "retirement" | "safety_net";
  horizon: "under_3" | "3_to_7" | "over_7";
  riskComfort: "low" | "medium" | "high";
  experience: "new" | "some" | "experienced";
  allowedMarkets: Array<"stocks" | "crypto">;
  maxOrderAmount: number;
  maxDailyAmount?: number;
  maxPositionPercent?: number;
  maxLossAmount?: number;
  approvalMode?: "explain_only" | "confirm_each" | "manage_within_limits";
};

export type ManagedPlanInput = { recurringAmount: number; frequency: "weekly" | "biweekly" | "monthly" };

const portfolios = {
  conservative: [
    { symbol: "BND", name: "Total Bond Market ETF", market: "stocks", weight: 55, reason: "Helps reduce large swings." },
    { symbol: "VTI", name: "Total Stock Market ETF", market: "stocks", weight: 35, reason: "Broad, diversified US growth." },
    { symbol: "VXUS", name: "International Stock ETF", market: "stocks", weight: 10, reason: "Adds global diversification." },
  ],
  balanced: [
    { symbol: "VTI", name: "Total Stock Market ETF", market: "stocks", weight: 55, reason: "Broad foundation for long-term growth." },
    { symbol: "BND", name: "Total Bond Market ETF", market: "stocks", weight: 25, reason: "Cushions some market volatility." },
    { symbol: "VXUS", name: "International Stock ETF", market: "stocks", weight: 15, reason: "Spreads exposure beyond the US." },
    { symbol: "BTC", name: "Bitcoin", market: "crypto", weight: 5, reason: "A small, capped growth allocation." },
  ],
  growth: [
    { symbol: "VTI", name: "Total Stock Market ETF", market: "stocks", weight: 50, reason: "Broad core growth exposure." },
    { symbol: "QQQ", name: "Nasdaq 100 ETF", market: "stocks", weight: 25, reason: "Adds higher-growth companies." },
    { symbol: "VXUS", name: "International Stock ETF", market: "stocks", weight: 15, reason: "Diversifies across regions." },
    { symbol: "BTC", name: "Bitcoin", market: "crypto", weight: 10, reason: "Limited higher-volatility growth exposure." },
  ],
} as const;

const practicePrices: Record<string, number> = { BND: 73.25, VTI: 302.4, VXUS: 68.15, QQQ: 548.7, BTC: 108500 };

function assessRisk(profile: ManagedProfileInput) {
  if (profile.riskComfort === "low" || profile.horizon === "under_3") return "conservative" as const;
  if (profile.riskComfort === "high" && profile.horizon === "over_7") return "growth" as const;
  return "balanced" as const;
}

function nextRun(frequency: ManagedPlanInput["frequency"], from = new Date()) {
  const result = new Date(from);
  result.setDate(result.getDate() + (frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : 30));
  return result;
}

async function logActivity(userId: string, planId: string, type: string, title: string, explanation: string, metadata?: unknown) {
  await db.insert(managedActivities).values({ id: randomUUID(), userId, planId, type, title, explanation, metadata, createdAt: new Date() });
}

export async function getManagedState(userId: string) {
  const [profile] = await db.select().from(managedProfiles).where(eq(managedProfiles.userId, userId)).limit(1);
  const [plan] = await db.select().from(managedPlans).where(eq(managedPlans.userId, userId)).orderBy(desc(managedPlans.updatedAt)).limit(1);
  const activities = plan
    ? await db.select().from(managedActivities).where(and(eq(managedActivities.userId, userId), eq(managedActivities.planId, plan.id))).orderBy(desc(managedActivities.createdAt)).limit(20)
    : [];
  return { profile: profile ?? null, plan: plan ?? null, activities };
}

export async function saveManagedProfile(userId: string, input: ManagedProfileInput) {
  const riskLevel = assessRisk(input);
  const now = new Date();
  const [profile] = await db.insert(managedProfiles).values({
    id: randomUUID(), userId, ...input, riskLevel, authorityLevel: "practice_managed",
    maxOrderAmount: String(input.maxOrderAmount), maxDailyAmount: String(input.maxDailyAmount ?? input.maxOrderAmount * 3),
    maxPositionPercent: input.maxPositionPercent ?? 20, maxLossAmount: String(input.maxLossAmount ?? input.maxOrderAmount),
    approvalMode: input.approvalMode ?? "manage_within_limits", createdAt: now, updatedAt: now,
  }).onConflictDoUpdate({
    target: managedProfiles.userId,
    set: { ...input, riskLevel, maxOrderAmount: String(input.maxOrderAmount), maxDailyAmount: String(input.maxDailyAmount ?? input.maxOrderAmount * 3), maxPositionPercent: input.maxPositionPercent ?? 20, maxLossAmount: String(input.maxLossAmount ?? input.maxOrderAmount), approvalMode: input.approvalMode ?? "manage_within_limits", updatedAt: now },
  }).returning();
  return profile;
}

export async function proposeManagedPlan(userId: string, input: ManagedPlanInput) {
  const [profile] = await db.select().from(managedProfiles).where(eq(managedProfiles.userId, userId)).limit(1);
  if (!profile) throw Object.assign(new Error("Complete your investor profile first."), { statusCode: 409 });
  const base = portfolios[profile.riskLevel as keyof typeof portfolios] ?? portfolios.balanced;
  const allowed = new Set(profile.allowedMarkets);
  let allocations: Array<{ symbol: string; name: string; market: string; weight: number; reason: string }> = base.filter(item => allowed.has(item.market)).map(item => ({ ...item }));
  if (!allocations.length) allocations = portfolios.conservative.map(item => ({ ...item }));
  const total = allocations.reduce((sum, item) => sum + item.weight, 0);
  allocations = allocations.map(item => ({ ...item, weight: Math.round(item.weight / total * 100) }));
  const drift = 100 - allocations.reduce((sum, item) => sum + item.weight, 0);
  if (drift) allocations[0] = { ...allocations[0], weight: allocations[0].weight + drift };
  const now = new Date();
  const [plan] = await db.insert(managedPlans).values({
    id: randomUUID(), userId, profileId: profile.id,
    name: `${profile.riskLevel[0].toUpperCase()}${profile.riskLevel.slice(1)} path`, status: "proposed",
    recurringAmount: String(input.recurringAmount), frequency: input.frequency, allocations,
    rationale: `A ${profile.riskLevel} practice portfolio built around your ${profile.goal.replaceAll("_", " ")} goal and ${profile.horizon.replaceAll("_", "-")} year horizon.`,
    nextRunAt: null, lastRunAt: null, createdAt: now, updatedAt: now,
  }).returning();
  await logActivity(userId, plan.id, "proposal", "Your plan is ready", "Trade Pro created this proposal from your goal, timeline, risk comfort, and permission limits.");
  return plan;
}

export async function changeManagedPlanStatus(userId: string, planId: string, action: "activate" | "pause" | "resume") {
  const [current] = await db.select().from(managedPlans).where(and(eq(managedPlans.id, planId), eq(managedPlans.userId, userId))).limit(1);
  if (!current) throw Object.assign(new Error("Managed plan not found."), { statusCode: 404 });
  const status = action === "pause" ? "paused" : "active";
  const now = new Date();
  const [plan] = await db.update(managedPlans).set({ status, nextRunAt: action === "pause" ? current.nextRunAt : nextRun(current.frequency as ManagedPlanInput["frequency"], now), updatedAt: now })
    .where(and(eq(managedPlans.id, planId), eq(managedPlans.userId, userId))).returning();
  await logActivity(userId, plan.id, action, action === "pause" ? "AI investing paused" : action === "resume" ? "AI investing resumed" : "AI investing activated",
    action === "pause" ? "No new managed practice orders will be placed until you resume." : "Your permission limits are active. You can pause at any time.");
  return plan;
}

export async function runManagedPlanNow(userId: string, planId: string) {
  const [plan] = await db.select().from(managedPlans).where(and(eq(managedPlans.id, planId), eq(managedPlans.userId, userId))).limit(1);
  if (!plan) throw Object.assign(new Error("Managed plan not found."), { statusCode: 404 });
  if (plan.status !== "active") throw Object.assign(new Error("Activate the plan before running an investment."), { statusCode: 409 });
  const [profile] = await db.select().from(managedProfiles).where(eq(managedProfiles.id, plan.profileId)).limit(1);
  const holding = plan.allocations[0];
  const amount = Math.min(Number(plan.recurringAmount), Number(profile.maxOrderAmount));
  const price = practicePrices[holding.symbol] ?? 100;
  const result = await executePracticeOrder(userId, {
    symbol: holding.symbol, assetClass: holding.market, side: "buy", orderType: "market",
    quantity: amount / price, notionalAmount: amount, estimatedPrice: price,
    riskLevel: profile.riskLevel, tradeScore: 90,
    tickerName: holding.name, reason: `AI managed: ${holding.reason}`, origin: "ai_managed",
  });
  const now = new Date();
  const [updated] = await db.update(managedPlans).set({ lastRunAt: now, nextRunAt: nextRun(plan.frequency as ManagedPlanInput["frequency"], now), updatedAt: now })
    .where(eq(managedPlans.id, plan.id)).returning();
  await logActivity(userId, plan.id, "investment", `Invested $${amount.toFixed(2)} in ${holding.symbol}`,
    `${holding.reason} This practice order stayed within your $${Number(profile.maxOrderAmount).toFixed(0)} per-order limit.`, { orderId: result.order.id, symbol: holding.symbol, amount });
  return { plan: updated, order: result.order, newBalance: result.newBalance };
}

export async function runDueManagedPlans() {
  const due = await db.select({ id: managedPlans.id, userId: managedPlans.userId }).from(managedPlans)
    .where(and(eq(managedPlans.status, "active"), lte(managedPlans.nextRunAt, new Date()))).limit(25);
  for (const plan of due) {
    try { await runManagedPlanNow(plan.userId, plan.id); }
    catch (error) { console.error(`[managedInvesting] plan ${plan.id} did not run:`, error); }
  }
}
