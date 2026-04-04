import { Button } from "@/components/ui/button";
import { getShopsByUserId } from "@/lib/db/queries/shops";
import { getTagsByUserId } from "@/lib/db/queries/tags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilterBar } from "./_components/FilterBar";
import { ShopList } from "./_components/ShopList";

type SearchParams = Promise<{
	category?: string;
	priceRange?: string;
	tagId?: string;
	area?: string;
	sort_order?: string;
}>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const params = await searchParams;
	const { category, priceRange, tagId, area, sort_order } = params;

	// sort_order パラメータを sort/order に変換
	let sort: "name" | "created_at" = "created_at";
	let order: "asc" | "desc" = "desc";
	if (sort_order === "name_asc") {
		sort = "name";
		order = "asc";
	} else if (sort_order === "created_at_asc") {
		sort = "created_at";
		order = "asc";
	}

	// 店舗一覧・タグ一覧を並列取得
	const [shopsData, tags] = await Promise.all([
		getShopsByUserId(user.id, {
			category,
			priceRange: priceRange as
				| "〜¥999"
				| "¥1,000〜¥2,999"
				| "¥3,000〜¥5,999"
				| "¥6,000〜¥9,999"
				| "¥10,000〜"
				| "価格帯不明"
				| undefined,
			tagId,
			area,
			sort,
			order,
		}),
		getTagsByUserId(user.id),
	]);

	const currentSort = sort_order ?? "";

	return (
		<div className="space-y-6">
			{/* ページヘッダー */}
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">マイリスト</h1>
				<Button asChild size="default">
					<Link href="/shops/new">
						<Plus size={16} aria-hidden="true" />
						<span>店舗を追加</span>
					</Link>
				</Button>
			</div>

			{/* フィルタバー */}
			<FilterBar
				tags={tags}
				currentCategory={category ?? ""}
				currentPriceRange={priceRange ?? ""}
				currentTagId={tagId ?? ""}
				currentArea={area ?? ""}
				currentSort={currentSort}
			/>

			{/* 店舗件数 */}
			{shopsData.total > 0 && (
				<p className="text-sm text-muted-foreground">{shopsData.total}件の店舗</p>
			)}

			{/* 店舗一覧 */}
			<ShopList shops={shopsData.items} />
		</div>
	);
}
