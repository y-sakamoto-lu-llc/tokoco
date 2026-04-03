import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateEmailSchema } from "@/lib/validations/auth";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
	}

	// サーバーサイドバリデーション
	const result = updateEmailSchema.safeParse(body);
	if (!result.success) {
		return NextResponse.json(
			{ error: "有効なメールアドレスを入力してください" },
			{ status: 400 }
		);
	}

	const { email } = result.data;

	// JWT 認証
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
	}

	// メールアドレス更新（Supabase が確認メールを送信する）
	const { error } = await supabase.auth.updateUser({ email });

	if (error) {
		// 既に使用中のメールアドレス
		if (
			error.code === "email_exists" ||
			error.message?.toLowerCase().includes("already registered")
		) {
			return NextResponse.json(
				{ error: "このメールアドレスはすでに使用されています" },
				{ status: 409 }
			);
		}
		console.error("[PATCH /api/auth/email] Supabase error:", error);
		return NextResponse.json(
			{ error: "メールアドレスの更新中にエラーが発生しました" },
			{ status: 500 }
		);
	}

	return NextResponse.json(
		{ message: "確認メールを送信しました。新しいメールアドレスで確認してください" },
		{ status: 200 }
	);
}
