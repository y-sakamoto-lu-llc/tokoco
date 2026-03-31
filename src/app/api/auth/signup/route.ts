import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validations/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
	}

	// サーバーサイドバリデーション
	const result = signupSchema.safeParse(body);
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

	const { email, password, displayName } = result.data;

	const supabase = await createSupabaseServerClient();

	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
	const { error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: { display_name: displayName },
			emailRedirectTo: `${siteUrl}/auth/callback`,
		},
	});

	if (error) {
		// メール重複エラー
		if (error.code === "user_already_exists") {
			return NextResponse.json(
				{ error: "このメールアドレスはすでに使用されています" },
				{ status: 409 }
			);
		}
		console.error("[POST /api/auth/signup] Supabase error:", error);
		return NextResponse.json({ error: "登録処理中にエラーが発生しました" }, { status: 500 });
	}

	return NextResponse.json(
		{
			message: "確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。",
		},
		{ status: 201 }
	);
}
