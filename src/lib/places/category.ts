const CATEGORY_MAP: { pattern: string; category: string }[] = [
	{ pattern: "japanese_restaurant", category: "和食" },
	{ pattern: "sushi_restaurant", category: "寿司" },
	{ pattern: "ramen_restaurant", category: "ラーメン" },
	{ pattern: "chinese_restaurant", category: "中華" },
	{ pattern: "korean_restaurant", category: "韓国料理" },
	{ pattern: "italian_restaurant", category: "イタリアン" },
	{ pattern: "french_restaurant", category: "フレンチ" },
	{ pattern: "pizza_restaurant", category: "ピザ" },
	{ pattern: "hamburger_restaurant", category: "バーガー" },
	{ pattern: "steak_house", category: "ステーキ" },
	{ pattern: "seafood_restaurant", category: "海鮮" },
	{ pattern: "vegetarian_restaurant", category: "ベジタリアン" },
	{ pattern: "cafe", category: "カフェ" },
	{ pattern: "coffee_shop", category: "カフェ" },
	{ pattern: "bar", category: "バー・居酒屋" },
	{ pattern: "izakaya_restaurant", category: "バー・居酒屋" },
	{ pattern: "bakery", category: "ベーカリー" },
	{ pattern: "fast_food_restaurant", category: "ファストフード" },
	{ pattern: "restaurant", category: "レストラン" },
];

export function convertTypes(types: string[] | undefined): string | null {
	if (!types?.length) return null;
	for (const { pattern, category } of CATEGORY_MAP) {
		if (types.includes(pattern)) return category;
	}
	return null;
}
