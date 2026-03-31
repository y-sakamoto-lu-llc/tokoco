import { PRICE_RANGE_VALUES } from "@/db/schema";
import { z } from "zod";

export { PRICE_RANGE_VALUES };
export type PriceRange = (typeof PRICE_RANGE_VALUES)[number];

// URL フィールドの共通バリデーター（空文字を null 扱いに統一、javascript:/data: スキームを拒否）
const optionalUrl = z
	.string()
	.max(2048, "URLが長すぎます")
	.refine(
		(url) => {
			if (url === "") return true;
			try {
				new URL(url);
				return true;
			} catch {
				return false;
			}
		},
		{ message: "正しいURL形式で入力してください" }
	)
	.refine(
		(url) => {
			if (url === "") return true;
			const lower = url.toLowerCase();
			return !lower.startsWith("javascript:") && !lower.startsWith("data:");
		},
		{ message: "安全でないURLは使用できません" }
	)
	.transform((v) => v || null)
	.nullable()
	.optional();

// 店舗作成（SHOP-01〜06）
export const createShopSchema = z.object({
	name: z
		.string()
		.min(1, "店舗名は必須です")
		.max(100, "店舗名は100文字以内で入力してください")
		.trim(),
	area: z.string().max(100, "エリアは100文字以内で入力してください").trim().optional(),
	address: z.string().max(200, "住所は200文字以内で入力してください").trim().optional(),
	phone: z
		.string()
		.max(20, "電話番号は20文字以内で入力してください")
		.regex(/^[\d\-+() ]*$/, "電話番号は数字・ハイフン・括弧のみ使用できます")
		.optional(),
	category: z.string().max(50, "カテゴリは50文字以内で入力してください").trim().optional(),
	priceRange: z.enum(PRICE_RANGE_VALUES).optional(),
	externalRating: z
		.number()
		.min(0, "評価は0以上の値を入力してください")
		.max(5, "評価は5以下の値を入力してください")
		.optional(),
	businessHours: z.string().max(500, "営業時間は500文字以内で入力してください").optional(),
	websiteUrl: optionalUrl,
	googleMapsUrl: optionalUrl,
	sourceUrl: optionalUrl,
	photoUrl: optionalUrl,
	note: z.string().max(1000, "メモは1000文字以内で入力してください").trim().optional(),
	tagIds: z.array(z.string().uuid("tagId は UUID 形式で指定してください")).optional(),
});
export type CreateShopInput = z.infer<typeof createShopSchema>;

// 店舗更新（SHOP-19・20）
export const updateShopSchema = createShopSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "更新するフィールドを1つ以上指定してください",
	});
export type UpdateShopInput = z.infer<typeof updateShopSchema>;

// 店舗一覧取得のクエリパラメータ（SHOP-16・17）
export const shopListQuerySchema = z.object({
	category: z.string().optional(),
	priceRange: z.enum(PRICE_RANGE_VALUES).optional(),
	tagId: z.string().uuid("tagId は UUID 形式で指定してください").optional(),
	area: z.string().optional(),
	sort: z.enum(["created_at", "name"]).default("created_at"),
	order: z.enum(["asc", "desc"]).default("desc"),
});
export type ShopListQuery = z.infer<typeof shopListQuerySchema>;

// Google Places テキスト検索（SHOP-02）
export const placesSearchQuerySchema = z.object({
	query: z
		.string()
		.min(1, "検索キーワードは必須です")
		.max(200, "検索キーワードは200文字以内で入力してください")
		.trim(),
});
export type PlacesSearchQuery = z.infer<typeof placesSearchQuerySchema>;

// Google Places 詳細取得（SHOP-02・04）
export const placesDetailsQuerySchema = z.object({
	placeId: z.string().min(1, "placeId は必須です"),
});
export type PlacesDetailsQuery = z.infer<typeof placesDetailsQuerySchema>;

// URL から店舗情報取得（SHOP-03）
export const placesFromUrlSchema = z.object({
	url: z
		.string()
		.min(1, "URLは必須です")
		.url("正しいURL形式で入力してください")
		.max(2048, "URLが長すぎます"),
});
export type PlacesFromUrlInput = z.infer<typeof placesFromUrlSchema>;
