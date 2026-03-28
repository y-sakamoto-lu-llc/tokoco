import { createClient } from "@supabase/supabase-js";

// このファイルは Route Handler 内からのみ import すること
// Client Component や Server Component で使用してはならない
export function createSupabaseAdminClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

	return createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}
