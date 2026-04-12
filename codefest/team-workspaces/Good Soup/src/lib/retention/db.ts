import { Pool } from "pg";

let pool: Pool | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required retention database env var: ${name}`);
  }

  return value.trim();
}

export function getRetentionPool(): Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    user: requireEnv("DB_USER"),
    host: requireEnv("DB_HOST"),
    database: requireEnv("DB_DATABASE"),
    password: requireEnv("DB_PASSWORD"),
    port: Number.parseInt(process.env.DB_PORT ?? "5432", 10),
  });

  return pool;
}
