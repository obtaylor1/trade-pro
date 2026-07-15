import dotenv from "dotenv";

// Local development must be reproducible even when a supervising process has
// stale environment variables. Production continues to trust its deployment
// environment and never lets a checked-out .env override it.
dotenv.config({ override: process.env.NODE_ENV !== "production" });

