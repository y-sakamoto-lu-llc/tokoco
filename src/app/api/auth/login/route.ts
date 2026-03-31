import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
	}

	// サーバーサイドバリデーション
	const result = loginSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json(
			{ error: "メールアドレスまたはパスワードの形式が正しくありません" },
			{ status: 400 }
		);
	}

	const { email, password } = result.data;

	const supabase = await createSupabaseServerClient();

	const { data, error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		// レートリミット超過
		if (error.status === 429) {
			return NextResponse.json(
				{ error: "ログイン試行回数の上限に達しました。しばらく後にお試しください" },
				{ status: 429 }
			);
		}
		// 認証失敗（メール or パスワード不一致）
		console.error("[POST /api/auth/login] Supabase error:", error);
		return NextResponse.json(
			{ error: "メールアドレスまたはパスワードが正しくありません" },
			{ status: 401 }
		);
	}

	// メール未確認の場合
	if (!data.user.email_confirmed_at) {
		return NextResponse.json(
			{
				error: "メールアドレスの確認が完了していません。確認メールをご確認ください",
			},
			{ status: 401 }
		);
	}

	const displayName =
		(data.user.user_metadata?.display_name as string | undefined) ?? data.user.email ?? "";

	return NextResponse.json(
		{
			user: {
				id: data.user.id,
				email: data.user.email ?? "",
				displayName,
			},
		},
		{ status: 200 }
	);
}
