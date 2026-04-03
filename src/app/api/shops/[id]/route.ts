import { deleteShop, getShopById, updateShop } from "@/lib/db/queries/shops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateShopSchema } from "@/lib/validations/shop";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/shops/[id]
 * 店舗詳細取得（タグ含む）
 * 認証: JWT 必須
 */
export async function GET(_request: Request, { params }: RouteContext) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
	}

	const { id } = await params;

	try {
		const shop = await getShopById(user.id, id);
		if (!shop) {
			return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
		}
		return NextResponse.json(shop, { status: 200 });
	} catch (err) {
		console.error("[GET /api/shops/[id]] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}

/**
 * PATCH /api/shops/[id]
 * 店舗情報更新（partial update）
 * 認証: JWT 必須
 */
export async function PATCH(request: Request, { params }: RouteContext) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
	}

	const { id } = await params;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
	}

	const result = updateShopSchema.safeParse(body);
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
		const shop = await updateShop(user.id, id, result.data);
		if (!shop) {
			return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
		}
		return NextResponse.json(shop, { status: 200 });
	} catch (err) {
		console.error("[PATCH /api/shops/[id]] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}

/**
 * DELETE /api/shops/[id]
 * 店舗削除（使用ゼロのタグも自動削除）
 * 認証: JWT 必須
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
	}

	const { id } = await params;

	try {
		const deleted = await deleteShop(user.id, id);
		if (!deleted) {
			return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
		}
		return new NextResponse(null, { status: 204 });
	} catch (err) {
		console.error("[DELETE /api/shops/[id]] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}
