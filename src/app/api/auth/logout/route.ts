import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
	const supabase = await createSupabaseServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
	}

	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error("[POST /api/auth/logout] Supabase error:", error);
		return NextResponse.json({ error: "ログアウト処理中にエラーが発生しました" }, { status: 500 });
	}

	return new NextResponse(null, { status: 204 });
}
