import { deleteTag } from "@/lib/db/queries/tags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/tags/[id]
 * タグ削除
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
		const deleted = await deleteTag(user.id, id);
		if (!deleted) {
			return NextResponse.json({ error: "タグが見つかりません" }, { status: 404 });
		}
		return new NextResponse(null, { status: 204 });
	} catch (err) {
		console.error("[DELETE /api/tags/[id]] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}
