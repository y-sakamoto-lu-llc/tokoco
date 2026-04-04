import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import Link from "next/link";

export function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="rounded-full bg-muted p-4 mb-4">
				<Store size={32} className="text-muted-foreground" aria-hidden="true" />
			</div>
			<h2 className="text-lg font-semibold mb-2">まだ店舗が登録されていません</h2>
			<p className="text-sm text-muted-foreground mb-6">
				お気に入りの店舗を追加して、リストを作りましょう
			</p>
			<Button asChild size="lg">
				<Link href="/shops/new">店舗を追加する</Link>
			</Button>
		</div>
	);
}
