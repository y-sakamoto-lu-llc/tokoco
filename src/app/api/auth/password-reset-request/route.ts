import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passwordResetRequestSchema } from "@/lib/validations/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
	}

	// サーバーサイドバリデーション
	const result = passwordResetRequestSchema.safeParse(body);
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

	const { email } = result.data;

	const supabase = await createSupabaseServerClient();

	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
	// エラーの有無にかかわらず同じレスポンスを返す（ユーザー列挙攻撃対策）
	await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${siteUrl}/auth/password-reset-callback`,
	});

	return NextResponse.json({
		message: "パスワードリセットメールを送信しました（登録済みの場合）",
	});
}
