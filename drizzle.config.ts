/**
 * Drizzle Kit configuration
 *
 * Used for:
 *   - `drizzle-kit generate`  — generate SQL migration files from schema changes
 *   - `drizzle-kit migrate`   — apply pending migrations to the DB
 *   - `drizzle-kit studio`    — launch Drizzle Studio (local DB browser)
 *
 * Note: migrations are managed via `supabase/migrations/` and applied by
 * Supabase CLI in the normal workflow.  This config exists so that
 * `drizzle-kit` can introspect the live schema and detect drift.
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./supabase/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "",
	},
});
