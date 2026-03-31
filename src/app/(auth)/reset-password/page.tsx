import Link from "next/link";

import { PasswordResetRequestForm } from "./_components/PasswordResetRequestForm";

export default function ResetPasswordPage() {
	return (
		<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
			<div className="mb-6">
				<h1 className="text-xl font-semibold">パスワードリセット</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					登録済みのメールアドレスにリセット用のリンクを送信します
				</p>
			</div>

			<PasswordResetRequestForm />

			<p className="mt-4 text-center text-sm text-muted-foreground">
				<Link href="/login" className="text-primary underline-offset-4 hover:underline">
					ログインに戻る
				</Link>
			</p>
		</div>
	);
}
