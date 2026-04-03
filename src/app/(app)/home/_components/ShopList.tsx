import { ShopCard } from "@/components/shop/ShopCard";
import { EmptyState } from "./EmptyState";

type Shop = {
	id: string;
	name: string;
	area: string | null;
	category: string | null;
	priceRange: string | null;
	photoUrl: string | null;
	tags: { id: string; name: string }[];
	createdAt: string;
};

type ShopListProps = {
	shops: Shop[];
};

export function ShopList({ shops }: ShopListProps) {
	if (shops.length === 0) {
		return <EmptyState />;
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="店舗一覧">
			{shops.map((shop) => (
				<ShopCard key={shop.id} shop={shop} />
			))}
		</div>
	);
}
