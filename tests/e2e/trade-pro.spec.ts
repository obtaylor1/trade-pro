import { expect, test, type Page } from "@playwright/test";

async function loginDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /Try Live Demo/ }).click();
  await expect(page).toHaveURL(/\/$/);
  const token = await page.evaluate(() => window.localStorage.getItem("tp_token"));
  if (!token) throw new Error("Demo login did not create an auth token");
  return token;
}

async function resetPortfolio(page: Page, token: string) {
  const response = await page.request.post("/api/portfolio/reset", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe("Trade Pro critical workflows", () => {
  test("practice order debits the visible and persisted balance", async ({ page }) => {
    const token = await loginDemo(page);
    await resetPortfolio(page, token);

    await page.goto("/markets");
    await page.getByRole("button", { name: /Practice This Trade/ }).click();
    await expect(page.getByText("Your practice balance has been updated.", { exact: true })).toBeVisible();
    await expect(page.locator(".sidebar")).toContainText("$9,999.75");

    const me = await page.request.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    expect((await me.json()).paperBalance).toBe("9999.75");
    await resetPortfolio(page, token);
  });

  test("portfolio reset clears practice trades, orders, and automation", async ({ page }) => {
    const token = await loginDemo(page);
    await resetPortfolio(page, token);
    const created = await page.request.post("/api/trades/execute", {
      headers: { Authorization: `Bearer ${token}` },
      data: { market: "forex", ticker: "EUR-USD", tickerName: "EUR/USD", action: "BUY", entryPrice: 1.08, units: 0.2315, investedAmount: 0.25 },
    });
    expect(created.ok()).toBeTruthy();

    await page.goto("/my-trades");
    await expect(page.getByRole("button", { name: /Manual Trades \(1\)/ })).toBeVisible();
    await page.getByRole("button", { name: /Reset Practice Portfolio/ }).click();
    await page.getByRole("button", { name: "Reset Portfolio" }).click();
    await expect(page.getByRole("button", { name: /Manual Trades \(0\)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Auto Trades \(0\)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Trade History \(0\)/ })).toBeVisible();
    await expect(page.locator(".sidebar")).toContainText("$10,000.00");
  });

  test("every broker card is marked as simulated and Public can connect", async ({ page }) => {
    const token = await loginDemo(page);
    await page.goto("/connect-broker");
    await expect(page.getByRole("heading", { name: "Connect a Trading Account" })).toBeVisible();

    const badgeAudit = await page.locator(".broker-sandbox-card").evaluateAll(cards => ({
      count: cards.length,
      missing: cards.filter(card => getComputedStyle(card, "::before").content !== '"SANDBOX SIMULATION"').length,
    }));
    expect(badgeAudit.count).toBeGreaterThan(10);
    expect(badgeAudit.missing).toBe(0);

    const publicCard = page.locator(".broker-sandbox-card").filter({ has: page.getByRole("heading", { name: "Public" }) });
    await publicCard.getByRole("button", { name: "Connect" }).click();
    const dialog = page.getByRole("dialog", { name: "Connect Your Trading Account" });
    await dialog.getByLabel("Account Nickname *").fill("QA Public Sandbox");
    await dialog.getByRole("button", { name: "Create Sandbox Profile" }).click();
    await expect(page.getByText("QA Public Sandbox")).toBeVisible();

    const accounts = await page.request.get("/api/trading/accounts", { headers: { Authorization: `Bearer ${token}` } });
    const qaAccount = (await accounts.json()).find((account: { accountLabel: string }) => account.accountLabel === "QA Public Sandbox");
    expect(qaAccount).toBeTruthy();
    const removed = await page.request.delete(`/api/trading/accounts/${qaAccount.id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(removed.ok()).toBeTruthy();
  });

  test("saved market, amount, and duration defaults initialize the Trade page", async ({ page }) => {
    await loginDemo(page);
    await page.evaluate(() => window.localStorage.setItem("trade-pro-settings", JSON.stringify({
      defaultMarket: "crypto", defaultTradeAmount: "5", defaultTradeDuration: "long",
    })));
    await page.goto("/markets");
    await expect(page.getByRole("button", { name: /Crypto Digital coins/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /Long-Term Weeks/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "$5", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
});
