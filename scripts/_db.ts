import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Shared Prisma client for maintenance scripts.
 *
 * Uses the Supabase IPv4 Supavisor pooler, built from the (URL-encoded)
 * password in .env's DATABASE_URL. The direct endpoint
 * (db.<ref>.supabase.co:5432) is IPv6-only and goes unreachable when the local
 * network drops its IPv6 route, so scripts that must always work (backups,
 * resets) go through the pooler. Runtime node-postgres needs sslmode=no-verify
 * (the pooler presents a self-signed chain).
 */
function poolerConnectionString(): string {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const m = env.match(/DATABASE_URL="postgresql:\/\/postgres:([^@]*)@/);
  if (!m) throw new Error("Could not read DB password from .env DATABASE_URL");
  const encPw = m[1];
  return `postgresql://postgres.usjrrhmvgkhdcpdsetnl:${encPw}@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=no-verify`;
}

export function makePrisma(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: poolerConnectionString() });
  return new PrismaClient({ adapter });
}
