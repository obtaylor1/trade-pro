import { storage } from "./storage";
import { getPrice } from "./marketDataService";
import { randomUUID } from "crypto";

export function calculateNextAmount({
  originalAmount,
  profitLoss,
  reinvestMode,
  maxReinvestAmount,
}: {
  originalAmount: number;
  profitLoss: number;
  reinvestMode: string;
  maxReinvestAmount?: number;
}) {
  if (profitLoss <= 0) return 0;

  let nextAmount = 0;

  if (reinvestMode === "none") {
    nextAmount = 0;
  } else if (reinvestMode === "profit_only") {
    nextAmount = profitLoss;
  } else if (reinvestMode === "profit_plus_principal") {
    nextAmount = originalAmount + profitLoss;
  }

  if (maxReinvestAmount) {
    nextAmount = Math.min(nextAmount, maxReinvestAmount);
  }

  return Number(nextAmount.toFixed(2));
}

async function processOpenCycles() {
  try {
    const openCycles = await storage.getActiveCycles();
    const now = new Date();

    for (const cycle of openCycles) {
      const plan = await storage.getAutoTradePlan(cycle.autoTradePlanId);
      if (!plan || plan.status !== "active") continue;

      const rule = await storage.getAutoTradeRuleForPlan(plan.id);
      if (!rule) continue;

      const tickerPrice = getPrice(plan.symbol).price;

      const entry = parseFloat(String(cycle.entryPrice || plan.initialAmount));
      const invested = parseFloat(String(cycle.startingAmount));

      const directionFactor = plan.direction === "SELL" ? -1 : 1;
      const pctChange = (tickerPrice - entry) / entry;
      const currentPnL = parseFloat((directionFactor * pctChange * invested).toFixed(2));

      const profitTarget = parseFloat(String(rule.profitTargetAmount));
      const stopLoss = parseFloat(String(rule.stopLossAmount));
      const scheduledCloseTime = new Date(rule.scheduledCloseTime);

      let shouldClose = false;
      let closeReason = "";

      if (currentPnL >= profitTarget) {
        shouldClose = true;
        closeReason = "profit_target";
      } else if (currentPnL <= -stopLoss) {
        shouldClose = true;
        closeReason = "stop_loss";
      } else if (now >= scheduledCloseTime) {
        shouldClose = true;
        closeReason = "scheduled_time";
      }

      if (shouldClose) {
        const won = currentPnL > 0;
        const status = won ? "won" : "lost";
        const endingAmount = invested + currentPnL;

        let reinvestAmount = 0;
        if (won && plan.reinvestMode !== "none") {
          reinvestAmount = calculateNextAmount({
            originalAmount: invested,
            profitLoss: currentPnL,
            reinvestMode: plan.reinvestMode,
            maxReinvestAmount: parseFloat(String(plan.currentCycleAmount)) * 1.5
          });
        }

        const settlement = await storage.settleAutoTradeCycle(
          cycle.id,
          plan.id,
          plan.userId,
          plan.mode,
          currentPnL,
          endingAmount,
          closeReason,
          reinvestAmount,
          status,
          `Auto Practice Cycle #${cycle.cycleNumber} closed: ${closeReason.toUpperCase()} met. PnL: $${currentPnL >= 0 ? "+" : ""}${currentPnL}.`,
          { pnl: currentPnL, closeReason, exitPrice: tickerPrice },
        );
        // Another worker or a manual stop already settled this cycle.
        if (!settlement.settled) continue;

        const nextCycleNum = cycle.cycleNumber + 1;
        const completedCycles = plan.completedCycles + 1;
        const planCycles = await storage.getAutoTradeCyclesForPlan(plan.id);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todaysCycles = planCycles.filter(item => new Date(item.createdAt) >= startOfDay);
        const dailyPnl = todaysCycles.reduce((sum, item) => sum + parseFloat(String(item.profitLoss ?? 0)), 0);
        const totalPnl = planCycles.reduce((sum, item) => sum + parseFloat(String(item.profitLoss ?? 0)), 0);

        let nextStatus = plan.status;
        if (!won && plan.stopAfterLoss) {
          nextStatus = "stopped";
          await storage.createAutoTradeEvent(plan.id, null, "stopped", "Auto Practice plan stopped: Stop After Loss rule triggered.");
        } else if (dailyPnl <= -Math.abs(parseFloat(String(plan.maxDailyLoss)))) {
          nextStatus = "stopped";
          await storage.createAutoTradeEvent(plan.id, null, "stopped", "Auto Practice plan stopped: Daily loss limit reached.");
        } else if (totalPnl >= parseFloat(String(plan.profitGoalAmount))) {
          nextStatus = "completed";
          await storage.createAutoTradeEvent(plan.id, null, "completed", "Auto Practice plan completed: Profit goal reached.");
        } else if (todaysCycles.length >= plan.maxDailyTrades) {
          nextStatus = "stopped";
          await storage.createAutoTradeEvent(plan.id, null, "stopped", "Auto Practice plan stopped: Daily trade limit reached.");
        } else if (completedCycles >= plan.maxCycles) {
          nextStatus = "completed";
          await storage.createAutoTradeEvent(plan.id, null, "completed", "Auto Practice plan completed: Maximum cycles reached.");
        }

        await storage.updateAutoTradePlanStatus(plan.id, nextStatus);
        
        if (nextStatus === "active") {
          let nextStartingAmt = invested;
          if (won) {
            if (plan.reinvestMode === "profit_only") {
              nextStartingAmt = reinvestAmount;
            } else if (plan.reinvestMode === "profit_plus_principal") {
              nextStartingAmt = reinvestAmount;
            }
          }

          const nextCloseTime = new Date(Date.now() + rule.closeAfterMinutes * 60 * 1000);
          const started = await storage.startNextAutoTradeCycle(
            plan.id, plan.userId, plan.mode, nextCycleNum, nextStartingAmt,
            tickerPrice, completedCycles, rule.id, nextCloseTime,
          );
          if (!started) {
            await storage.updateAutoTradePlanStatus(plan.id, "failed");
            await storage.createAutoTradeEvent(plan.id, null, "error", "Failed to start next cycle: Insufficient account balance.");
          }
        } else {
          await storage.updateAutoTradePlanCycles(plan.id, completedCycles, 0);
        }
      }
    }
  } catch (e) {
    console.error("Error in processOpenCycles worker:", e);
  }
}

export function startAutoTradeWorker() {
  setInterval(processOpenCycles, 20000);
  console.log("[autoTradeWorker] Auto Trading background loop active");
}
