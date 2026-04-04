import { createTag, getTagsByUserId } from "@/lib/db/queries/tags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTagSchema } from "@/lib/validations/tag";
import { NextResponse } from "next/server";

/**
 * GET /api/tags
 * タグ一覧取得（使用店舗数ゼロのタグは除外）
 * 認証: JWT 必須
 */
export async function GET() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
	}

	try {
		const items = await getTagsByUserId(user.id);
		return NextResponse.json({ items }, { status: 200 });
	} catch (err) {
		console.error("[GET /api/tags] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}

/**
 * POST /api/tags
 * タグ新規作成
 * 認証: JWT 必須
 */
export async function POST(request: Request) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
	}

	const result = createTagSchema.safeParse(body);
	if (!result.success) {
		const errors: Record<string, string[]> = {};
		for (const issue of result.error.issues) {
			const field = issue.path[0]?.toString() ?? "_";
			if (!errors[field]) errors[field] = [];
			errors[field].push(issue.message);
		}
		return NextResponse.json({ error: "入力内容を確認してください", errors }, { status: 400 });
	}

	try {
		const tag = await createTag(user.id, result.data);
		if (typeof tag === "object" && "type" in tag && tag.type === "conflict") {
			return NextResponse.json(
				{ error: "同名のタグがすでに存在します", existingId: tag.existingId },
				{ status: 409 }
			);
		}
		return NextResponse.json(tag, { status: 201 });
	} catch (err) {
		console.error("[POST /api/tags] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}
