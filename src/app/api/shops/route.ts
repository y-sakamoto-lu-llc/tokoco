import { createShop, getShopsByUserId } from "@/lib/db/queries/shops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createShopSchema, shopListQuerySchema } from "@/lib/validations/shop";
import { NextResponse } from "next/server";

/**
 * GET /api/shops
 * 店舗一覧取得（フィルタ・ソート対応）
 * 認証: JWT 必須
 */
export async function GET(request: Request) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const rawQuery = {
		category: searchParams.get("category") ?? undefined,
		priceRange: searchParams.get("priceRange") ?? undefined,
		tagId: searchParams.get("tagId") ?? undefined,
		area: searchParams.get("area") ?? undefined,
		sort: searchParams.get("sort") ?? undefined,
		order: searchParams.get("order") ?? undefined,
	};

	const result = shopListQuerySchema.safeParse(rawQuery);
	if (!result.success) {
		const firstError = result.error.issues[0];
		return NextResponse.json(
			{ error: firstError?.message ?? "クエリパラメータが不正です" },
			{ status: 400 }
		);
	}

	try {
		const data = await getShopsByUserId(user.id, result.data);
		return NextResponse.json(data, { status: 200 });
	} catch (err) {
		console.error("[GET /api/shops] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}

/**
 * POST /api/shops
 * 店舗登録
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

	const result = createShopSchema.safeParse(body);
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
		const shop = await createShop(user.id, result.data);
		return NextResponse.json(shop, { status: 201 });
	} catch (err) {
		console.error("[POST /api/shops] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}
