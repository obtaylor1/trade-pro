import { storage } from "./storage";
import { randomUUID } from "crypto";

export interface OrderRequest {
  symbol: string;
  assetClass: string;
  side: "buy" | "sell";
  orderType: string;
  quantity: number;
  notionalAmount: number;
  estimatedPrice: number;
  estimatedCost: number;
  tradeScore?: number;
  riskLevel?: string;
  reason?: string;
}

export interface BrokerAdapter {
  getAccount(userId: string): Promise<any>;
  getBuyingPower(userId: string): Promise<number>;
  previewOrder(userId: string, order: OrderRequest): Promise<any>;
  placeOrder(userId: string, order: OrderRequest): Promise<any>;
  cancelOrder(orderId: string): Promise<void>;
  getOrderStatus(orderId: string): Promise<any>;
}

// ─── 1. Paper Broker Adapter ────────────────────────────────────────────────
export class PaperBrokerAdapter implements BrokerAdapter {
  async getAccount(userId: string) {
    const user = await storage.getUserById(userId);
    return {
      brokerName: "Paper Broker",
      mode: "paper",
      buyingPower: user ? parseFloat(user.paperBalance) : 10000,
      accountLabel: "Practice Account",
      status: "connected",
    };
  }

  async getBuyingPower(userId: string): Promise<number> {
    const user = await storage.getUserById(userId);
    return user ? parseFloat(user.paperBalance) : 10000;
  }

  async previewOrder(userId: string, order: OrderRequest): Promise<any> {
    const buyingPower = await this.getBuyingPower(userId);
    const cost = order.notionalAmount;
    const fees = 0; // Paper trades have no fees
    const total = cost + fees;

    // Both sides stake the notional amount in a paper account (a SELL is a
    // short position, not a cash sale), so both need the balance to cover it.
    if (total > buyingPower) {
      throw new Error(`Insufficient practice balance. Required: $${total.toFixed(2)}, Available: $${buyingPower.toFixed(2)}`);
    }

    return {
      symbol: order.symbol,
      assetClass: order.assetClass,
      side: order.side,
      quantity: order.quantity,
      estimatedPrice: order.estimatedPrice,
      estimatedCost: cost,
      estimatedFees: fees,
      estimatedTotal: total,
      allowed: true,
      reason: "Practice Mode checks passed successfully.",
    };
  }

  async placeOrder(userId: string, order: OrderRequest): Promise<any> {
    const preview = await this.previewOrder(userId, order);

    // Stake the notional atomically before writing any rows. Both BUY and
    // SELL debit the stake here; closing the trade credits stake + P&L back,
    // matching the legacy /api/trades flow.
    const newBal = await storage.debitBalance(userId, preview.estimatedTotal);
    if (newBal === null) {
      throw new Error("Insufficient practice balance.");
    }
    await storage.saveSnapshot(userId, newBal);

    const dbOrder = await storage.createOrder(userId, {
      tradingAccountId: null,
      mode: "paper",
      brokerName: "Paper Broker",
      brokerOrderId: `paper-order-${randomUUID().slice(0, 8)}`,
      symbol: order.symbol,
      assetClass: order.assetClass,
      side: order.side,
      orderType: order.orderType,
      quantity: String(order.quantity),
      notionalAmount: String(order.notionalAmount),
      estimatedPrice: String(order.estimatedPrice),
      estimatedCost: String(order.estimatedCost),
      estimatedFees: String(preview.estimatedFees),
      status: "filled", // Paper trades execute instantly
      tradeScore: order.tradeScore ?? null,
      riskLevel: order.riskLevel ?? null,
      reason: order.reason ?? null,
      openedAt: new Date(),
      closedAt: new Date(),
    });

    // Also log in legacy trades table to maintain compatibility with portfolio, charts, and trades list
    await storage.createTrade({
      userId,
      market: order.assetClass,
      ticker: order.symbol,
      tickerName: order.reason ?? `${order.symbol} Order`,
      action: order.side.toUpperCase(),
      entryPrice: String(order.estimatedPrice),
      units: String(order.quantity),
      investedAmount: String(order.notionalAmount),
      status: "OPEN",
      exitPrice: null,
      exitAt: null,
      pnl: "0",
      potentialGain: String(order.notionalAmount * 1.2),
    });

    // Log event in order_events
    await storage.createOrderEvent(
      dbOrder.id,
      "FILL",
      null,
      "filled",
      `Practice order executed successfully. Paper balance updated.`,
      { preview }
    );

    return dbOrder;
  }

  async cancelOrder(orderId: string): Promise<void> {
    const order = await storage.getOrder(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") {
      throw new Error(`Cannot cancel order in status: ${order.status}`);
    }
    await storage.updateOrderStatus(orderId, "canceled");
    await storage.createOrderEvent(
      orderId,
      "CANCEL",
      order.status,
      "canceled",
      "Practice order canceled by user."
    );
  }

  async getOrderStatus(orderId: string): Promise<any> {
    return storage.getOrder(orderId);
  }
}

// Helper stub for live adapters
abstract class StubBrokerAdapter implements BrokerAdapter {
  protected brokerName: string;

  constructor(brokerName: string) {
    this.brokerName = brokerName;
  }

  async getAccount(userId: string) {
    const userAccs = await storage.getTradingAccounts(userId);
    const acc = userAccs.find(a => a.brokerName.toLowerCase() === this.brokerName.toLowerCase());
    return {
      brokerName: this.brokerName,
      mode: "live",
      buyingPower: acc ? parseFloat(acc.buyingPower) : 25000,
      accountLabel: acc ? acc.accountLabel : `My ${this.brokerName} Account`,
      status: acc ? acc.status : "connected",
    };
  }

  async getBuyingPower(userId: string): Promise<number> {
    const userAccs = await storage.getTradingAccounts(userId);
    const acc = userAccs.find(a => a.brokerName.toLowerCase() === this.brokerName.toLowerCase());
    return acc ? parseFloat(acc.buyingPower) : 25000;
  }

  async previewOrder(userId: string, order: OrderRequest): Promise<any> {
    const cost = order.notionalAmount;
    const fees = 1.00; // Simulated flat live broker fee
    const total = cost + fees;
    return {
      symbol: order.symbol,
      assetClass: order.assetClass,
      side: order.side,
      quantity: order.quantity,
      estimatedPrice: order.estimatedPrice,
      estimatedCost: cost,
      estimatedFees: fees,
      estimatedTotal: total,
      allowed: true,
      reason: "Live mock sandbox validation successful.",
    };
  }

  async placeOrder(userId: string, order: OrderRequest): Promise<any> {
    const preview = await this.previewOrder(userId, order);
    const userAccs = await storage.getTradingAccounts(userId);
    const acc = userAccs.find(a => a.brokerName.toLowerCase() === this.brokerName.toLowerCase());

    const dbOrder = await storage.createOrder(userId, {
      tradingAccountId: acc ? acc.id : null,
      mode: "live",
      brokerName: this.brokerName,
      brokerOrderId: `live-${this.brokerName.toLowerCase()}-${randomUUID().slice(0, 8)}`,
      symbol: order.symbol,
      assetClass: order.assetClass,
      side: order.side,
      orderType: order.orderType,
      quantity: String(order.quantity),
      notionalAmount: String(order.notionalAmount),
      estimatedPrice: String(order.estimatedPrice),
      estimatedCost: String(order.estimatedCost),
      estimatedFees: String(preview.estimatedFees),
      status: "filled", // Executes instantly for demo convenience
      tradeScore: order.tradeScore ?? null,
      riskLevel: order.riskLevel ?? null,
      reason: order.reason ?? null,
      openedAt: new Date(),
      closedAt: new Date(),
    });

    // Also log in legacy trades table to maintain compatibility with portfolio, charts, and trades list
    await storage.createTrade({
      userId,
      market: order.assetClass,
      ticker: order.symbol,
      tickerName: order.reason ?? `${order.symbol} Order`,
      action: order.side.toUpperCase(),
      entryPrice: String(order.estimatedPrice),
      units: String(order.quantity),
      investedAmount: String(order.notionalAmount),
      status: "OPEN",
      exitPrice: null,
      exitAt: null,
      pnl: "0",
      potentialGain: String(order.notionalAmount * 1.2),
    });

    await storage.createOrderEvent(
      dbOrder.id,
      "FILL",
      null,
      "filled",
      `Mock live order executed successfully via sandbox endpoint.`,
      { preview }
    );

    return dbOrder;
  }

  async cancelOrder(orderId: string): Promise<void> {
    const order = await storage.getOrder(orderId);
    if (!order) throw new Error("Order not found");
    await storage.updateOrderStatus(orderId, "canceled");
    await storage.createOrderEvent(
      orderId,
      "CANCEL",
      order.status,
      "canceled",
      "Live order canceled by user."
    );
  }

  async getOrderStatus(orderId: string): Promise<any> {
    return storage.getOrder(orderId);
  }
}

// ─── 2. Alpaca Adapter ──────────────────────────────────────────────────────
export class AlpacaBrokerAdapter extends StubBrokerAdapter {
  constructor() {
    super("Alpaca");
  }
}

// ─── 3. Tradier Adapter ─────────────────────────────────────────────────────
export class TradierBrokerAdapter extends StubBrokerAdapter {
  constructor() {
    super("Tradier");
  }
}

// ─── 4. OANDA Adapter ───────────────────────────────────────────────────────
export class OandaBrokerAdapter extends StubBrokerAdapter {
  constructor() {
    super("OANDA");
  }
}

// ─── 5. Interactive Brokers Adapter ─────────────────────────────────────────
export class InteractiveBrokersAdapter extends StubBrokerAdapter {
  constructor() {
    super("Interactive Brokers");
  }
}

// Adapter Dispatcher helper
export function getBrokerAdapter(brokerName: string): BrokerAdapter {
  const name = brokerName.toLowerCase();
  if (name === "alpaca") return new AlpacaBrokerAdapter();
  if (name === "tradier") return new TradierBrokerAdapter();
  if (name === "oanda") return new OandaBrokerAdapter();
  if (name === "interactive brokers" || name === "interactivebrokers" || name === "ibkr") {
    return new InteractiveBrokersAdapter();
  }
  return new PaperBrokerAdapter();
}
