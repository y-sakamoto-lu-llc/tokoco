import { detachTagFromShop } from "@/lib/db/queries/shops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string; tagId: string }> };

/**
 * DELETE /api/shops/[id]/tags/[tagId]
 * 店舗からタグを外す（使用ゼロのタグは自動削除）
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

	const { id: shopId, tagId } = await params;

	try {
		const deleted = await detachTagFromShop(user.id, shopId, tagId);
		if (!deleted) {
			return NextResponse.json({ error: "タグの紐付けが見つかりません" }, { status: 404 });
		}
		return new NextResponse(null, { status: 204 });
	} catch (err) {
		console.error("[DELETE /api/shops/[id]/tags/[tagId]] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}
