import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DeleteAccountSection } from "./_components/DeleteAccountSection";
import { EmailForm } from "./_components/EmailForm";
import { PasswordForm } from "./_components/PasswordForm";
import { ProfileForm } from "./_components/ProfileForm";

export default async function SettingsPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const displayName =
		(user.user_metadata?.display_name as string | undefined) ?? user.email ?? "";
	const email = user.email ?? "";

	return (
		<div className="mx-auto max-w-xl space-y-10">
			<h1 className="text-2xl font-bold">アカウント設定</h1>

			{/* 表示名変更 */}
			<section className="space-y-4">
				<h2 className="text-lg font-semibold border-b pb-2">表示名</h2>
				<ProfileForm currentDisplayName={displayName} />
			</section>

			{/* メールアドレス変更 */}
			<section className="space-y-4">
				<h2 className="text-lg font-semibold border-b pb-2">メールアドレス</h2>
				<EmailForm currentEmail={email} />
			</section>

			{/* パスワード変更 */}
			<section className="space-y-4">
				<h2 className="text-lg font-semibold border-b pb-2">パスワード</h2>
				<PasswordForm />
			</section>

			{/* アカウント削除 */}
			<section className="space-y-4">
				<h2 className="text-lg font-semibold border-b pb-2 text-destructive">アカウント削除</h2>
				<p className="text-sm text-muted-foreground">
					アカウントを削除すると、登録した店舗・タグ・イベントのすべてのデータが削除されます。この操作は取り消せません。
				</p>
				<DeleteAccountSection />
			</section>
		</div>
	);
}
