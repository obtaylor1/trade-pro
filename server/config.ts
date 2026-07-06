import crypto from "crypto";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Resolves a required secret from the environment.
 * Production refuses to boot without it; development falls back to an
 * ephemeral random value so `npm run dev` still works, at the cost of
 * tokens/credentials not surviving a restart.
 */
function requireSecret(name: string): string {
  const value = process.env[name];
  if (value && value.length >= 16) return value;
  if (isProduction) {
    throw new Error(`${name} must be set to a value of at least 16 characters in production`);
  }
  console.warn(
    `[config] ${name} is not set — using an ephemeral development secret. ` +
    `Tokens and encrypted credentials will be invalidated on restart. Set ${name} in .env to persist them.`,
  );
  return crypto.randomBytes(32).toString("hex");
}

export const JWT_SECRET = requireSecret("JWT_SECRET");
export const ENCRYPTION_KEY = requireSecret("ENCRYPTION_KEY");

export const STARTING_BALANCE = 10_000;
