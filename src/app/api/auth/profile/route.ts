import { createDb } from "@/db";
import { profiles } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validations/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
	}

	// サーバーサイドバリデーション
	const result = updateProfileSchema.safeParse(body);
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

	const { displayName } = result.data;

	// JWT 認証
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
	}

	// Drizzle で profiles テーブルを更新
	const db = createDb();
	await db
		.update(profiles)
		.set({ displayName, updatedAt: new Date() })
		.where(eq(profiles.id, user.id));

	return NextResponse.json({ displayName }, { status: 200 });
}
