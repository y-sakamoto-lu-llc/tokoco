import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updatePasswordSchema } from "@/lib/validations/auth";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
	}

	// サーバーサイドバリデーション
	const result = updatePasswordSchema.safeParse(body);
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

	const { currentPassword, newPassword } = result.data;

	// JWT 認証
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user || !user.email) {
		return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
	}

	// 現在のパスワードを検証
	const { error: signInError } = await supabase.auth.signInWithPassword({
		email: user.email,
		password: currentPassword,
	});

	if (signInError) {
		return NextResponse.json(
			{ error: "現在のパスワードが正しくありません" },
			{ status: 400 }
		);
	}

	// 新しいパスワードに更新
	const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

	if (updateError) {
		console.error("[PATCH /api/auth/password] Supabase error:", updateError);
		return NextResponse.json(
			{ error: "パスワードの変更中にエラーが発生しました" },
			{ status: 500 }
		);
	}

	return NextResponse.json({ message: "パスワードを変更しました" }, { status: 200 });
}
