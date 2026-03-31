import { NewPasswordForm } from "./_components/NewPasswordForm";

export default function NewPasswordPage() {
	return (
		<div className="rounded-lg border border-border bg-card p-6 shadow-sm">
			<div className="mb-6">
				<h1 className="text-xl font-semibold">新しいパスワードを設定</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					新しいパスワードを入力してください
				</p>
			</div>

			<NewPasswordForm />
		</div>
	);
}
