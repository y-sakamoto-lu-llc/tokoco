import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");

	if (!code) {
		return NextResponse.redirect(`${origin}/reset-password?error=missing_code`);
	}

	const supabase = await createSupabaseServerClient();

	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		console.error("[GET /api/auth/password-reset-callback] exchangeCodeForSession error:", error);
		return NextResponse.redirect(`${origin}/reset-password?error=invalid_code`);
	}

	// パスワードリセット実行画面へリダイレクト
	return NextResponse.redirect(`${origin}/new-password`);
}
