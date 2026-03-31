import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
			<div className="text-center">
				<h1 className="text-3xl font-bold text-foreground">Tokoco</h1>
				<p className="mt-2 text-muted-foreground">
					レストランを記録・管理し、グループでの食事イベント調整を行うWebアプリ
				</p>
			</div>
			<div className="flex gap-4">
				<Button asChild>
					<Link href="/login">ログイン</Link>
				</Button>
				<Button variant="outline" asChild>
					<Link href="/signup">新規登録</Link>
				</Button>
			</div>
		</main>
	);
}
