import { attachTagToShop } from "@/lib/db/queries/shops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { attachTagSchema } from "@/lib/validations/tag";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/shops/[id]/tags
 * 店舗にタグを付与
 * 認証: JWT 必須
 */
export async function POST(request: Request, { params }: RouteContext) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
	}

	const { id: shopId } = await params;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
	}

	const result = attachTagSchema.safeParse(body);
	if (!result.success) {
		const firstError = result.error.issues[0];
		return NextResponse.json(
			{ error: firstError?.message ?? "入力内容を確認してください" },
			{ status: 400 }
		);
	}

	const { tagId } = result.data;

	try {
		const outcome = await attachTagToShop(user.id, shopId, tagId);

		if (outcome === "shop_not_found") {
			return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
		}
		if (outcome === "tag_not_found") {
			return NextResponse.json({ error: "タグが見つかりません" }, { status: 404 });
		}
		if (outcome === "conflict") {
			return NextResponse.json({ error: "このタグはすでに付与されています" }, { status: 409 });
		}

		return NextResponse.json(outcome, { status: 201 });
	} catch (err) {
		console.error("[POST /api/shops/[id]/tags] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}
