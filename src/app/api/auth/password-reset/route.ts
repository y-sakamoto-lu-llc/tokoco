import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passwordResetSchema } from "@/lib/validations/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
	}

	// サーバーサイドバリデーション
	const result = passwordResetSchema.safeParse(body);
	if (!result.success) {
		const errors: Record<string, string[]> = {};
		for (const issue of result.error.issues) {
			const field = issue.path[0]?.toString() ?? "_";
			if (!errors[field]) {
				errors[field] = [];
			}
			errors[field].push(issue.message);
		}
		return NextResponse.json({ error: "入力内容を確認してください", errors }, { status: 400 });
	}

	const { password } = result.data;

	const supabase = await createSupabaseServerClient();

	// セッションが有効かどうか確認（リセットトークン経由で確立された一時セッション）
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json(
			{ error: "リセットリンクが無効または期限切れです。再度申請してください" },
			{ status: 401 }
		);
	}

	const { error } = await supabase.auth.updateUser({ password });

	if (error) {
		console.error("[POST /api/auth/password-reset] Supabase error:", error);
		return NextResponse.json(
			{ error: "パスワードの変更中にエラーが発生しました" },
			{ status: 500 }
		);
	}

	return NextResponse.json({ message: "パスワードを変更しました" });
}
