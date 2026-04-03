import { TagBadge } from "@/components/shop/TagBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, ExternalLink, MapPin, Phone, Star } from "lucide-react";

type ShopDetailProps = {
	shop: {
		id: string;
		name: string;
		area: string | null;
		address: string | null;
		phone: string | null;
		category: string | null;
		priceRange: string | null;
		externalRating: number | null;
		businessHours: string | null;
		websiteUrl: string | null;
		googleMapsUrl: string | null;
		photoUrl: string | null;
		note: string | null;
		tags: { id: string; name: string }[];
	};
};

export function ShopDetail({ shop }: ShopDetailProps) {
	return (
		<div className="space-y-6">
			{/* 写真 */}
			{shop.photoUrl && (
				<div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={shop.photoUrl}
						alt={`${shop.name}の写真`}
						className="w-full h-full object-cover"
					/>
				</div>
			)}

			{/* 店名・カテゴリ・価格帯 */}
			<div>
				<div className="flex items-center gap-2 flex-wrap mb-2">
					{shop.category && <Badge variant="secondary">{shop.category}</Badge>}
					{shop.priceRange && <Badge variant="outline">{shop.priceRange}</Badge>}
					{shop.externalRating != null && (
						<span className="flex items-center gap-1 text-sm text-muted-foreground">
							<Star size={14} className="text-yellow-500 fill-yellow-500" aria-hidden="true" />
							{shop.externalRating.toFixed(1)}
						</span>
					)}
				</div>
				<h2 className="text-xl font-bold">{shop.name}</h2>
			</div>

			<Separator />

			{/* 店舗情報 */}
			<dl className="space-y-4">
				{(shop.area || shop.address) && (
					<div className="flex items-start gap-3">
						<dt className="flex-shrink-0">
							<MapPin size={16} className="text-muted-foreground mt-0.5" aria-label="住所" />
						</dt>
						<dd className="text-sm">
							{shop.area && <div className="font-medium">{shop.area}</div>}
							{shop.address && <div className="text-muted-foreground">{shop.address}</div>}
						</dd>
					</div>
				)}

				{shop.phone && (
					<div className="flex items-start gap-3">
						<dt className="flex-shrink-0">
							<Phone size={16} className="text-muted-foreground mt-0.5" aria-label="電話番号" />
						</dt>
						<dd>
							<a href={`tel:${shop.phone}`} className="text-sm hover:underline">
								{shop.phone}
							</a>
						</dd>
					</div>
				)}

				{shop.businessHours && (
					<div className="flex items-start gap-3">
						<dt className="flex-shrink-0">
							<Clock size={16} className="text-muted-foreground mt-0.5" aria-label="営業時間" />
						</dt>
						<dd className="text-sm whitespace-pre-line text-muted-foreground">
							{shop.businessHours}
						</dd>
					</div>
				)}

				{shop.websiteUrl && (
					<div className="flex items-start gap-3">
						<dt className="flex-shrink-0">
							<ExternalLink
								size={16}
								className="text-muted-foreground mt-0.5"
								aria-label="Webサイト"
							/>
						</dt>
						<dd>
							<a
								href={shop.websiteUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-primary hover:underline break-all"
							>
								{shop.websiteUrl}
							</a>
						</dd>
					</div>
				)}

				{shop.googleMapsUrl && (
					<div className="flex items-start gap-3">
						<dt className="flex-shrink-0">
							<MapPin
								size={16}
								className="text-muted-foreground mt-0.5"
								aria-label="Google マップ"
							/>
						</dt>
						<dd>
							<a
								href={shop.googleMapsUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-primary hover:underline"
							>
								Google マップで見る
							</a>
						</dd>
					</div>
				)}
			</dl>

			{/* タグ */}
			{shop.tags.length > 0 && (
				<>
					<Separator />
					<div>
						<h3 className="text-sm font-medium mb-2">タグ</h3>
						<div className="flex flex-wrap gap-1.5" aria-label="タグ一覧">
							{shop.tags.map((tag) => (
								<TagBadge key={tag.id} tag={tag} />
							))}
						</div>
					</div>
				</>
			)}

			{/* メモ */}
			<>
				<Separator />
				<div>
					<h3 className="text-sm font-medium mb-2">メモ</h3>
					{shop.note ? (
						<p className="text-sm whitespace-pre-line">{shop.note}</p>
					) : (
						<p className="text-sm text-muted-foreground">メモなし</p>
					)}
				</div>
			</>
		</div>
	);
}
