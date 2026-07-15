import { Router } from "express";
import { storage } from "../storage";
import { authed, authMiddleware } from "./middleware";
import { getPrice } from "../marketDataService";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const createPlanSchema = z.object({
  mode: z.enum(["paper", "live"]).default("paper"),
  market: z.enum(["stocks", "commodities", "crypto", "options", "forex"]),
  symbol: z.string().trim().regex(/^[A-Z0-9./=\-]{1,20}$/i),
  direction: z.enum(["BUY", "SELL"]),
  initialAmount: z.coerce.number().positive().max(100),
  reinvestMode: z.enum(["none", "profit_only", "profit_plus_principal"]).default("none"),
  maxCycles: z.coerce.number().int().min(1).max(20).default(5),
  maxDailyTrades: z.coerce.number().int().min(1).max(20).default(3),
  stopAfterLoss: z.boolean().default(true),
  maxDailyLoss: z.coerce.number().positive().optional(),
  profitGoalAmount: z.coerce.number().positive().optional(),
  closeAfterMinutes: z.coerce.number().int().min(5).max(1440).default(240),
  profitTargetAmount: z.coerce.number().positive().optional(),
  stopLossAmount: z.coerce.number().positive().optional(),
});

// POST /api/auto-trades/plans
router.post("/plans", authed(async (req, res) => {
  try {
    const {
      mode,
      market,
      symbol,
      direction,
      initialAmount,
      reinvestMode = "none",
      maxCycles = 5,
      maxDailyTrades,
      stopAfterLoss,
      maxDailyLoss,
      profitGoalAmount,
      closeAfterMinutes,
      profitTargetAmount,
      stopLossAmount
    } = createPlanSchema.parse(req.body);

    const userId = req.userId;
    const initialAmtNum = initialAmount;

    // Lock live mode check
    if (mode === "live") {
      // 1. Verify broker connected
      const brokerAccounts = await storage.getTradingAccounts(userId);
      if (brokerAccounts.length === 0) {
        return res.status(400).json({ message: "Broker Sandbox automation is locked. Connect a sandbox profile first." });
      }

      // 2. Verify education complete (Modules 1, 2, 5 required)
      const progress = await storage.getLearnProgress(userId);
      const doneIds = progress.filter(p => p.completed).map(p => p.moduleId);
      const allRequiredDone = [1, 2, 5].every(id => doneIds.includes(id));
      if (!allRequiredDone) {
        return res.status(400).json({ message: "Broker Sandbox automation is locked. Complete all required academy lessons first." });
      }
    }

    const currentPrice = getPrice(symbol).price;
    const { plan } = await storage.createAutoTradePlanWithCycle(
      userId,
      {
        mode,
        status: "active",
        market,
        symbol,
        direction,
        initialAmount: String(initialAmtNum),
        currentCycleAmount: String(initialAmtNum),
        reinvestMode,
        maxCycles,
        completedCycles: 0,
        maxDailyTrades,
        maxDailyLoss: String(maxDailyLoss ?? initialAmtNum * 0.1),
        stopAfterLoss,
        profitGoalAmount: String(profitGoalAmount ?? initialAmtNum * 0.2),
      },
      {
        closeType: "whichever_first",
        closeAfterMinutes,
        scheduledCloseTime: new Date(Date.now() + closeAfterMinutes * 60 * 1000),
        profitTargetAmount: String(profitTargetAmount ?? initialAmtNum * 0.1),
        stopLossAmount: String(stopLossAmount ?? initialAmtNum * 0.05),
        trailingStopEnabled: false,
      },
      initialAmtNum,
      currentPrice,
      mode === "paper",
    );

    res.json({ success: true, plan });
  } catch (e: any) {
    console.error("Create auto trade plan failed:", e);
    if (e instanceof z.ZodError) return res.status(400).json({ message: e.issues[0]?.message || "Invalid auto-trade settings" });
    res.status(e.statusCode || 500).json({ message: e.message || "Failed to create auto trade plan" });
  }
}));

// GET /api/auto-trades/plans
router.get("/plans", authed(async (req, res) => {
  try {
    const plans = await storage.getUserAutoTradePlans(req.userId);
    res.json(plans);
  } catch (e: any) {
    res.status(500).json({ message: "Failed to fetch plans" });
  }
}));

// GET /api/auto-trades/plans/:id
router.get("/plans/:id", authed(async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await storage.getAutoTradePlan(id);
    if (!plan || plan.userId !== req.userId) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const rule = await storage.getAutoTradeRuleForPlan(id);
    const cycles = await storage.getAutoTradeCyclesForPlan(id);
    const events = await storage.getAutoTradeEventsForPlan(id);

    res.json({ plan, rule, cycles, events });
  } catch (e: any) {
    res.status(500).json({ message: "Failed to fetch plan details" });
  }
}));

// POST /api/auto-trades/plans/:id/stop
router.post("/plans/:id/stop", authed(async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await storage.getAutoTradePlan(id);
    if (!plan || plan.userId !== req.userId) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (plan.status !== "active") {
      return res.status(400).json({ message: "Plan is not currently active" });
    }

    // Stop plan
    await storage.updateAutoTradePlanStatus(id, "stopped");
    await storage.createAutoTradeEvent(id, null, "stopped", "Auto Practice plan stopped manually by user.");

    // Close any open cycle
    const cycles = await storage.getAutoTradeCyclesForPlan(id);
    const openCycle = cycles.find(c => c.status === "open");

    if (openCycle) {
      const tickerPrice = getPrice(plan.symbol).price;
      const entry = parseFloat(String(openCycle.entryPrice || plan.initialAmount));
      const invested = parseFloat(String(openCycle.startingAmount));

      const directionFactor = plan.direction === "SELL" ? -1 : 1;
      const pctChange = (tickerPrice - entry) / entry;
      const currentPnL = parseFloat((directionFactor * pctChange * invested).toFixed(2));
      const endingAmount = invested + currentPnL;

      const result = await storage.settleAutoTradeCycle(
        openCycle.id, id, req.userId, plan.mode, currentPnL, endingAmount,
        "manual_close", 0, "closed",
        `Cycle #${openCycle.cycleNumber} closed manually. PnL: $${currentPnL >= 0 ? "+" : ""}${currentPnL}.`,
      );
      if (!result.settled) return res.status(409).json({ message: "This cycle was already settled" });
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: "Failed to stop plan" });
  }
}));

// POST /api/auto-trades/plans/:id/reinvest
router.post("/plans/:id/reinvest", authed(async (req, res) => {
  try {
    const { id } = req.params;
    const { reinvestMode } = req.body;
    
    if (!["none", "profit_only", "profit_plus_principal"].includes(reinvestMode)) {
      return res.status(400).json({ message: "Invalid reinvest mode" });
    }

    const plan = await storage.getAutoTradePlan(id);
    if (!plan || plan.userId !== req.userId) {
      return res.status(404).json({ message: "Plan not found" });
    }

    await storage.updateAutoTradePlanReinvest(id, reinvestMode);
    await storage.createAutoTradeEvent(id, null, "reinvested", `Reinvestment setting changed to ${reinvestMode.toUpperCase()} by user.`);

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: "Failed to update reinvest setting" });
  }
}));

export default router;
