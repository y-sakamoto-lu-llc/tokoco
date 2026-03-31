import Link from "next/link";

import { SignupForm } from "./_components/SignupForm";

export default function SignupPage() {
	return (
		<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
			<div className="mb-6">
				<h1 className="text-xl font-semibold">新規登録</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					アカウントを作成してTokocoをはじめましょう
				</p>
			</div>

			<SignupForm />

			<p className="mt-4 text-center text-sm text-muted-foreground">
				すでにアカウントをお持ちの方は{" "}
				<Link href="/login" className="text-primary underline-offset-4 hover:underline">
					ログイン
				</Link>
			</p>
		</div>
	);
}
