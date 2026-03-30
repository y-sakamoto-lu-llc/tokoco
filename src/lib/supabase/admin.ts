import type { Database } from "@/types/database";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase service_role クライアント
 *
 * このファイルは src/app/api/ 配下の Route Handler からのみ import すること。
 * Client Component や Server Component で使用してはならない（service_role キーが
 * クライアントバンドルに含まれるリスクを防ぐため）。
 */
export function createSupabaseAdminClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

	return createClient<Database>(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}
