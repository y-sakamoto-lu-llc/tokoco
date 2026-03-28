/**
 * Drizzle ORM client for Edge Runtime (Supabase)
 * Uses postgres.js via drizzle-orm/postgres-js — Edge-compatible HTTP transport
 * is handled by @supabase/supabase-js at the application layer.
 *
 * This module re-exports schema types and the schema object so that
 * application code imports from a single entry point.
 */
export * from "./schema";
