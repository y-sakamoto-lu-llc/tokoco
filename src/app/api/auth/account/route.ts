import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(_request: Request) {
	// JWT 認証（自分自身のみ削除可能）
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
	}

	const userId = user.id;

	// service_role クライアントで auth.users を削除
	// - on_profile_deleted Trigger が投票を匿名化（AUTH-15 ②）
	// - profiles の on delete cascade により profiles が削除される
	// - profiles → shops / tags / events が on delete cascade で削除される（AUTH-15 ①）
	const supabaseAdmin = createSupabaseAdminClient();
	const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

	if (deleteError) {
		console.error("[DELETE /api/auth/account] Supabase admin error:", deleteError);
		return NextResponse.json(
			{ error: "アカウントの削除中にエラーが発生しました" },
			{ status: 500 }
		);
	}

	// Cookie を削除（セッションをサインアウト）
	await supabase.auth.signOut();

	return new NextResponse(null, { status: 204 });
}
