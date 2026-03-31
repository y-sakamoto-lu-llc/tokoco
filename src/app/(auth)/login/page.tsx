import Link from "next/link";

import { LoginForm } from "./_components/LoginForm";

export default function LoginPage() {
	return (
		<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
			<div className="mb-6">
				<h1 className="text-xl font-semibold">ログイン</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					メールアドレスとパスワードを入力してください
				</p>
			</div>

			<LoginForm />

			<div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
				<p>
					<Link href="/reset-password" className="text-primary underline-offset-4 hover:underline">
						パスワードを忘れた方はこちら
					</Link>
				</p>
				<p>
					アカウントをお持ちでない方は{" "}
					<Link href="/signup" className="text-primary underline-offset-4 hover:underline">
						新規登録
					</Link>
				</p>
			</div>
		</div>
	);
}
