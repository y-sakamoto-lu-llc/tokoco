import Link from "next/link";

export default function VerifyEmailPage() {
	return (
		<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
			<div className="mb-4 flex items-center justify-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6 text-primary"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
						/>
					</svg>
				</div>
			</div>

			<h1 className="mb-2 text-center text-xl font-semibold">確認メールを送信しました</h1>
			<p className="text-center text-sm text-muted-foreground">
				ご登録のメールアドレスに確認メールを送信しました。
				<br />
				メール内のリンクをクリックして登録を完了してください。
			</p>

			<p className="mt-4 text-center text-sm text-muted-foreground">
				メールが届かない場合は、迷惑メールフォルダをご確認ください。
			</p>

			<div className="mt-6 border-t border-border pt-4 text-center">
				<Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">
					ログイン画面に戻る
				</Link>
			</div>
		</div>
	);
}
