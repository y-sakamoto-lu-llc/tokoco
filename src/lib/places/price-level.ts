import type { PriceRange } from "@/db/schema";

const PRICE_LEVEL_MAP: Record<string, PriceRange> = {
	PRICE_LEVEL_FREE: "〜¥999",
	PRICE_LEVEL_INEXPENSIVE: "¥1,000〜¥2,999",
	PRICE_LEVEL_MODERATE: "¥3,000〜¥5,999",
	PRICE_LEVEL_EXPENSIVE: "¥6,000〜¥9,999",
	PRICE_LEVEL_VERY_EXPENSIVE: "¥10,000〜",
};

export function convertPriceLevel(priceLevel: string | undefined): PriceRange {
	if (!priceLevel) return "価格帯不明";
	return PRICE_LEVEL_MAP[priceLevel] ?? "価格帯不明";
}
