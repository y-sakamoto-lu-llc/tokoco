"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { DeleteDialog } from "./DeleteDialog";
import { ShopDetail } from "./ShopDetail";
import { ShopEditForm } from "./ShopEditForm";
import { TagEditor } from "./TagEditor";

type Shop = {
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
	sourceUrl: string | null;
	photoUrl: string | null;
	note: string | null;
	tags: { id: string; name: string }[];
	createdAt: string;
	updatedAt: string;
};

type ShopDetailPageProps = {
	shop: Shop;
};

export function ShopDetailPage({ shop: initialShop }: ShopDetailPageProps) {
	const [shop, setShop] = useState<Shop>(initialShop);
	const [isEditing, setIsEditing] = useState(false);

	function handleEditSuccess(updatedFields: Partial<Shop>) {
		setShop((prev) => ({ ...prev, ...updatedFields }));
		setIsEditing(false);
	}

	if (isEditing) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-base font-semibold">店舗情報を編集</h2>
				</div>
				<ShopEditForm
					shop={shop}
					onSuccess={handleEditSuccess}
					onCancel={() => setIsEditing(false)}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* アクションボタン */}
			<div className="flex items-center justify-end gap-2">
				<Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
					<Pencil size={14} aria-hidden="true" />
					編集
				</Button>
				<DeleteDialog shopId={shop.id} shopName={shop.name} />
			</div>

			{/* 詳細表示 */}
			<ShopDetail shop={shop} />

			{/* タグ編集 */}
			<Separator />
			<div>
				<h3 className="text-sm font-medium mb-3">タグを管理</h3>
				<TagEditor shopId={shop.id} initialTags={shop.tags} />
			</div>
		</div>
	);
}
