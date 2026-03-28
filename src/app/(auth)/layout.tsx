export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
			<div className="mb-8 text-center">
				<h1 className="text-3xl font-bold text-primary">Tokoco</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					レストランを記録・管理し、グループでの食事イベント調整を行うWebアプリ
				</p>
			</div>
			<div className="w-full max-w-md">{children}</div>
		</div>
	);
}
