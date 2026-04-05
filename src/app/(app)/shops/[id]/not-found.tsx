import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ShopNotFound() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<h2 className="text-lg font-semibold mb-2">店舗が見つかりません</h2>
			<p className="text-sm text-muted-foreground mb-6">
				この店舗は存在しないか、アクセス権限がありません。
			</p>
			<Button asChild>
				<Link href="/home">マイリストへ戻る</Link>
			</Button>
		</div>
	);
}
