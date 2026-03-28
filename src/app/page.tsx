import { Button } from "@/components/ui/button";

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
			<h1 className="text-3xl font-bold text-foreground">Tokoco</h1>
			<p className="text-muted-foreground">
				レストランを記録・管理し、グループでの食事イベント調整を行うWebアプリ
			</p>
			<div className="flex gap-4">
				<Button>ログイン</Button>
				<Button variant="outline">新規登録</Button>
				<Button variant="secondary">ゲスト参加</Button>
			</div>
		</main>
	);
}
