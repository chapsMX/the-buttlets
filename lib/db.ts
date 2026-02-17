import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Missing DATABASE_URL/NEON_DATABASE_URL for Neon connection."
  );
}

export const sql = neon(connectionString);

