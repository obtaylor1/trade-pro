import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const { Pool } = await import("pg");
const { drizzle } = await import("drizzle-orm/node-postgres");

// The node-postgres adapter works with local Postgres, Railway Postgres, and
// hosted providers that expose a standard PostgreSQL connection string.
// Provider-specific serverless drivers should not be selected solely because
// a database is remote.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle({ client: pool, schema });
