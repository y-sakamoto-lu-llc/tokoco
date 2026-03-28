import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");

	if (code) {
		const supabase = await createSupabaseServerClient();
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			// パスワードリセット実行画面へリダイレクト
			return NextResponse.redirect(new URL("/reset-password", origin));
		}
	}

	// コードが無いかエラーの場合はログインページへ
	return NextResponse.redirect(new URL("/login", origin));
}
