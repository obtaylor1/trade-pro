import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const dbUrl = process.env.DATABASE_URL;
const isLocal = dbUrl.includes("localhost") || 
                dbUrl.includes("127.0.0.1") ||
                dbUrl.includes("host.docker.internal");

export let pool: any;
export let db: any;

if (isLocal) {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  pool = new Pool({ connectionString: dbUrl });
  db = drizzle({ client: pool, schema });
} else {
  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const ws = (await import("ws")).default;
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ connectionString: dbUrl });
  db = drizzle({ client: pool, schema });
}