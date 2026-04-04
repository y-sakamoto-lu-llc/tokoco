import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type ShopCardProps = {
	shop: {
		id: string;
		name: string;
		area: string | null;
		category: string | null;
		priceRange: string | null;
		externalRating?: number | null;
		photoUrl: string | null;
		tags: { id: string; name: string }[];
	};
};

const MAX_TAGS_SHOWN = 3;

export function ShopCard({ shop }: ShopCardProps) {
	return (
		<Link
			href={`/shops/${shop.id}`}
			className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
		>
			<Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
				<CardContent className="p-4">
					<div className="flex items-start gap-3">
						{/* 写真サムネイル */}
						<div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
							{shop.photoUrl ? (
								<Image
									src={shop.photoUrl}
									alt={`${shop.name}の写真`}
									fill
									className="object-cover"
									sizes="64px"
								/>
							) : (
								<div className="h-full w-full flex items-center justify-center bg-muted">
									<span className="text-muted-foreground text-xs">写真なし</span>
								</div>
							)}
						</div>

						<div className="flex-1 min-w-0">
							{/* カテゴリバッジ */}
							{shop.category && (
								<Badge variant="secondary" className="mb-1 text-xs">
									{shop.category}
								</Badge>
							)}

							{/* 店名 */}
							<h3 className="text-base font-semibold leading-tight truncate">{shop.name}</h3>

							{/* エリア */}
							{shop.area && (
								<p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
									<MapPin size={12} aria-hidden="true" />
									<span className="truncate">{shop.area}</span>
								</p>
							)}

							{/* 評価・価格帯 */}
							<div className="flex items-center gap-3 mt-1">
								{shop.externalRating != null && (
									<span className="text-sm flex items-center gap-1">
										<Star
											size={12}
											className="text-yellow-500 fill-yellow-500"
											aria-hidden="true"
										/>
										<span>{shop.externalRating.toFixed(1)}</span>
									</span>
								)}
								{shop.priceRange && (
									<span className="text-sm text-muted-foreground">{shop.priceRange}</span>
								)}
							</div>
						</div>
					</div>

					{/* タグ */}
					{shop.tags.length > 0 && (
						<div className="flex flex-wrap gap-1.5 mt-3">
							{shop.tags.slice(0, MAX_TAGS_SHOWN).map((tag) => (
								<Badge
									key={tag.id}
									variant="outline"
									className="text-xs bg-muted text-foreground border-0"
								>
									{tag.name}
								</Badge>
							))}
							{shop.tags.length > MAX_TAGS_SHOWN && (
								<Badge variant="outline" className="text-xs bg-muted text-foreground border-0">
									+{shop.tags.length - MAX_TAGS_SHOWN}
								</Badge>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</Link>
	);
}
