import type { Express } from "express";
import { authMiddleware, authed, makeToken } from "./middleware";

const configured = () => Boolean(process.env.ALPACA_CLIENT_ID && process.env.ALPACA_CLIENT_SECRET && process.env.ALPACA_REDIRECT_URI);

export function registerAlpacaRoutes(app: Express) {
  app.get("/api/brokers/alpaca/readiness", authMiddleware, authed(async (req, res) => {
    res.json({ provider: "Alpaca", configured: configured(), environment: "paper", liveEnabled: false, approvalRequired: true,
      missing: [!process.env.ALPACA_CLIENT_ID && "ALPACA_CLIENT_ID", !process.env.ALPACA_CLIENT_SECRET && "ALPACA_CLIENT_SECRET", !process.env.ALPACA_REDIRECT_URI && "ALPACA_REDIRECT_URI"].filter(Boolean) });
  }));
  app.post("/api/brokers/alpaca/oauth/start", authMiddleware, authed(async (req, res) => {
    if (!configured()) return res.status(503).json({ message: "Alpaca paper access is waiting for approved application credentials." });
    const state = makeToken(req.userId, req.isAdmin, "10m", { broker: "alpaca", oauthState: true });
    const params = new URLSearchParams({ response_type: "code", client_id: process.env.ALPACA_CLIENT_ID!, redirect_uri: process.env.ALPACA_REDIRECT_URI!, scope: "account:write trading" , state });
    res.json({ authorizationUrl: `https://app.alpaca.markets/oauth/authorize?${params}`, environment: "paper" });
  }));
  // Token exchange is intentionally not activated until Alpaca approves the
  // application and its exact OAuth callback requirements are verified.
}
