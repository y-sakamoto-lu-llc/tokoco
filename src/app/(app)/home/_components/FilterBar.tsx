"use client";

import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PRICE_RANGE_VALUES } from "@/db/schema";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const CATEGORIES = [
	"和食",
	"洋食",
	"中華",
	"イタリアン",
	"フレンチ",
	"焼肉",
	"寿司",
	"ラーメン",
	"カフェ",
	"居酒屋",
	"その他",
];

const SORT_OPTIONS = [
	{ value: "created_at_desc", label: "登録日（新→古）" },
	{ value: "created_at_asc", label: "登録日（古→新）" },
	{ value: "name_asc", label: "店名（五十音順）" },
];

type Tag = {
	id: string;
	name: string;
};

type FilterBarProps = {
	tags: Tag[];
	currentCategory: string;
	currentPriceRange: string;
	currentTagId: string;
	currentArea: string;
	currentSort: string;
};

export function FilterBar({
	tags,
	currentCategory,
	currentPriceRange,
	currentTagId,
	currentArea,
	currentSort,
}: FilterBarProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	function updateFilter(key: string, value: string) {
		const params = new URLSearchParams(searchParams.toString());
		if (value && value !== "all") {
			params.set(key, value);
		} else {
			params.delete(key);
		}
		startTransition(() => {
			router.push(`/home?${params.toString()}`);
		});
	}

	function clearFilters() {
		startTransition(() => {
			router.push("/home");
		});
	}

	const hasActiveFilters =
		currentCategory || currentPriceRange || currentTagId || currentArea || currentSort;

	return (
		<div
			className={`transition-opacity duration-150 ${isPending ? "opacity-60 pointer-events-none" : ""}`}
			aria-busy={isPending}
		>
			<div className="flex flex-wrap gap-2 items-center">
				{/* ジャンル */}
				<Select value={currentCategory || "all"} onValueChange={(v) => updateFilter("category", v)}>
					<SelectTrigger className="w-[120px] h-9 text-sm" aria-label="ジャンルで絞り込み">
						<SelectValue placeholder="ジャンル" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">すべてのジャンル</SelectItem>
						{CATEGORIES.map((cat) => (
							<SelectItem key={cat} value={cat}>
								{cat}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* 価格帯 */}
				<Select
					value={currentPriceRange || "all"}
					onValueChange={(v) => updateFilter("priceRange", v)}
				>
					<SelectTrigger className="w-[140px] h-9 text-sm" aria-label="価格帯で絞り込み">
						<SelectValue placeholder="価格帯" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">すべての価格帯</SelectItem>
						{PRICE_RANGE_VALUES.map((price) => (
							<SelectItem key={price} value={price}>
								{price}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* タグ */}
				{tags.length > 0 && (
					<Select value={currentTagId || "all"} onValueChange={(v) => updateFilter("tagId", v)}>
						<SelectTrigger className="w-[120px] h-9 text-sm" aria-label="タグで絞り込み">
							<SelectValue placeholder="タグ" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">すべてのタグ</SelectItem>
							{tags.map((tag) => (
								<SelectItem key={tag.id} value={tag.id}>
									{tag.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{/* ソート */}
				<Select
					value={currentSort || "created_at_desc"}
					onValueChange={(v) => updateFilter("sort_order", v)}
				>
					<SelectTrigger className="w-[160px] h-9 text-sm" aria-label="並び替え">
						<SelectValue placeholder="並び替え" />
					</SelectTrigger>
					<SelectContent>
						{SORT_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* クリアボタン */}
				{hasActiveFilters && (
					<Button
						variant="ghost"
						size="sm"
						onClick={clearFilters}
						className="h-9 text-muted-foreground hover:text-foreground"
					>
						条件をクリア
					</Button>
				)}
			</div>
		</div>
	);
}
