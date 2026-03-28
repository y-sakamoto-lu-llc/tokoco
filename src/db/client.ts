/**
 * Drizzle ORM client for Edge Runtime (Cloudflare Pages)
 *
 * Uses @neondatabase/serverless (HTTP transport) because postgres.js and
 * node-postgres require Node.js APIs that are unavailable on the Edge.
 *
 * Supabase exposes a PostgreSQL-compatible endpoint that is compatible with
 * the Neon serverless driver, allowing us to use drizzle-orm/neon-http here.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDatabaseUrl(): string {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL environment variable is not set");
	}
	return url;
}

/**
 * Create a Drizzle ORM client instance.
 *
 * Call this function inside Route Handlers / Server Actions to obtain a
 * fully-typed client.  Do NOT call it at module top-level so that the
 * environment variable is read at request time (important for local dev
 * with `.env.local` and for edge environments).
 */
export function createDb() {
	const sql = neon(getDatabaseUrl());
	return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;
