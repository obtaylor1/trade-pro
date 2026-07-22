import { runDueManagedPlans } from "./managedInvestingService";

export function startManagedInvestingWorker() {
  const timer = setInterval(() => void runDueManagedPlans(), 60_000);
  timer.unref();
  console.log("[managedInvesting] recurring practice investing active");
}
