import type { Express } from "express";
import { z } from "zod";
import { authMiddleware, authed } from "./middleware";
import { changeManagedPlanStatus, getManagedState, proposeManagedPlan, runManagedPlanNow, saveManagedProfile } from "../managedInvestingService";

const profileSchema = z.object({
  goal: z.enum(["grow_wealth", "home", "retirement", "safety_net"]),
  horizon: z.enum(["under_3", "3_to_7", "over_7"]),
  riskComfort: z.enum(["low", "medium", "high"]),
  experience: z.enum(["new", "some", "experienced"]),
  allowedMarkets: z.array(z.enum(["stocks", "crypto"])).min(1),
  maxOrderAmount: z.coerce.number().min(10).max(10000),
  maxDailyAmount: z.coerce.number().min(10).max(50000).optional(),
  maxPositionPercent: z.coerce.number().int().min(5).max(100).optional(),
  maxLossAmount: z.coerce.number().min(10).max(50000).optional(),
  approvalMode: z.enum(["explain_only", "confirm_each", "manage_within_limits"]).optional(),
});
const planSchema = z.object({ recurringAmount: z.coerce.number().min(10).max(10000), frequency: z.enum(["weekly", "biweekly", "monthly"]) });

export function registerManagedInvestingRoutes(app: Express) {
  app.get("/api/managed", authMiddleware, authed(async (req, res) => res.json(await getManagedState(req.userId))));
  app.post("/api/managed/profile", authMiddleware, authed(async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
    res.json(await saveManagedProfile(req.userId, parsed.data));
  }));
  app.post("/api/managed/proposal", authMiddleware, authed(async (req, res) => {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
    res.json(await proposeManagedPlan(req.userId, parsed.data));
  }));
  for (const action of ["activate", "pause", "resume"] as const) {
    app.post(`/api/managed/plans/:id/${action}`, authMiddleware, authed(async (req, res) => res.json(await changeManagedPlanStatus(req.userId, req.params.id, action))));
  }
  app.post("/api/managed/plans/:id/run-now", authMiddleware, authed(async (req, res) => res.json(await runManagedPlanNow(req.userId, req.params.id))));
}
