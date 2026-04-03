import { ShopCardSkeleton } from "@/components/shop/ShopCardSkeleton";

export default function HomeLoading() {
	return (
		<div className="space-y-6" aria-busy="true" aria-label="読み込み中">
			<div className="flex items-center justify-between">
				<div className="h-8 w-32 bg-muted rounded-md animate-pulse" />
				<div className="h-9 w-24 bg-muted rounded-md animate-pulse" />
			</div>
			<div className="flex gap-2">
				<div className="h-9 w-32 bg-muted rounded-md animate-pulse" />
				<div className="h-9 w-36 bg-muted rounded-md animate-pulse" />
				<div className="h-9 w-32 bg-muted rounded-md animate-pulse" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: 6 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
					<ShopCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}
