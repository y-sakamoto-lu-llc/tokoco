import { describe, expect, it } from "vitest";
import {
	PRICE_RANGE_VALUES,
	createShopSchema,
	placesDetailsQuerySchema,
	placesFromUrlSchema,
	placesSearchQuerySchema,
	shopListQuerySchema,
	updateShopSchema,
} from "./shop";

// ---------------------------------------------------------------------------
// createShopSchema
// ---------------------------------------------------------------------------
describe("createShopSchema", () => {
	it("最小限の有効な入力（name のみ）を受け入れる", () => {
		const result = createShopSchema.safeParse({ name: "テスト食堂" });
		expect(result.success).toBe(true);
	});

	it("全フィールドが有効な場合を受け入れる", () => {
		const result = createShopSchema.safeParse({
			name: "テスト食堂",
			area: "渋谷",
			address: "東京都渋谷区1-1-1",
			phone: "03-1234-5678",
			category: "和食",
			priceRange: "¥1,000〜¥2,999",
			externalRating: 4.5,
			businessHours: "11:00〜22:00",
			websiteUrl: "https://example.com",
			googleMapsUrl: "https://maps.google.com/example",
			sourceUrl: "https://tabelog.com/example",
			photoUrl: "https://example.com/photo.jpg",
			note: "おすすめのお店です",
			tagIds: ["550e8400-e29b-41d4-a716-446655440000"],
		});
		expect(result.success).toBe(true);
	});

	it("name が空文字の場合はエラー", () => {
		const result = createShopSchema.safeParse({ name: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "name");
			expect(err?.message).toBe("店舗名は必須です");
		}
	});

	it("name が100文字を超える場合はエラー", () => {
		const result = createShopSchema.safeParse({ name: "あ".repeat(101) });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "name");
			expect(err?.message).toBe("店舗名は100文字以内で入力してください");
		}
	});

	it("name がちょうど100文字の場合は受け入れる", () => {
		const result = createShopSchema.safeParse({ name: "あ".repeat(100) });
		expect(result.success).toBe(true);
	});

	it("name の前後の空白が trim される", () => {
		const result = createShopSchema.safeParse({ name: "  テスト食堂  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("テスト食堂");
		}
	});

	it("priceRange が有効な enum 値を受け入れる", () => {
		for (const value of PRICE_RANGE_VALUES) {
			const result = createShopSchema.safeParse({ name: "テスト", priceRange: value });
			expect(result.success).toBe(true);
		}
	});

	it("priceRange が無効な値の場合はエラー", () => {
		const result = createShopSchema.safeParse({ name: "テスト", priceRange: "¥999以下" });
		expect(result.success).toBe(false);
	});

	it("externalRating が 0〜5 の範囲を受け入れる", () => {
		for (const rating of [0, 2.5, 5]) {
			const result = createShopSchema.safeParse({ name: "テスト", externalRating: rating });
			expect(result.success).toBe(true);
		}
	});

	it("externalRating が 0 未満の場合はエラー", () => {
		const result = createShopSchema.safeParse({ name: "テスト", externalRating: -0.1 });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "externalRating");
			expect(err?.message).toBe("評価は0以上の値を入力してください");
		}
	});

	it("externalRating が 5 を超える場合はエラー", () => {
		const result = createShopSchema.safeParse({ name: "テスト", externalRating: 5.1 });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "externalRating");
			expect(err?.message).toBe("評価は5以下の値を入力してください");
		}
	});

	it("websiteUrl が有効な URL を受け入れる", () => {
		const result = createShopSchema.safeParse({
			name: "テスト",
			websiteUrl: "https://example.com",
		});
		expect(result.success).toBe(true);
	});

	it("websiteUrl が空文字の場合は null に変換する", () => {
		const result = createShopSchema.safeParse({ name: "テスト", websiteUrl: "" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.websiteUrl).toBeNull();
		}
	});

	it("websiteUrl が不正な URL の場合はエラー", () => {
		const result = createShopSchema.safeParse({
			name: "テスト",
			websiteUrl: "not-a-url",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "websiteUrl");
			expect(err?.message).toBe("正しいURL形式で入力してください");
		}
	});

	it("websiteUrl が javascript: スキームの場合はエラー（XSS対策）", () => {
		const result = createShopSchema.safeParse({
			name: "テスト",
			websiteUrl: "javascript:alert(1)",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "websiteUrl");
			expect(err?.message).toBe("安全でないURLは使用できません");
		}
	});

	it("websiteUrl が data: スキームの場合はエラー（XSS対策）", () => {
		const result = createShopSchema.safeParse({
			name: "テスト",
			websiteUrl: "data:text/html,<script>alert(1)</script>",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "websiteUrl");
			expect(err?.message).toBe("安全でないURLは使用できません");
		}
	});

	it("phone が有効なフォーマットを受け入れる", () => {
		for (const phone of ["03-1234-5678", "+81-3-1234-5678", "(03)1234-5678", "0312345678"]) {
			const result = createShopSchema.safeParse({ name: "テスト", phone });
			expect(result.success).toBe(true);
		}
	});

	it("phone に無効な文字が含まれる場合はエラー", () => {
		const result = createShopSchema.safeParse({ name: "テスト", phone: "03-1234-abcd" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "phone");
			expect(err?.message).toBe("電話番号は数字・ハイフン・括弧のみ使用できます");
		}
	});

	it("tagIds が UUID 配列を受け入れる", () => {
		const result = createShopSchema.safeParse({
			name: "テスト",
			tagIds: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"],
		});
		expect(result.success).toBe(true);
	});

	it("tagIds に UUID でない値が含まれる場合はエラー", () => {
		const result = createShopSchema.safeParse({
			name: "テスト",
			tagIds: ["not-a-uuid"],
		});
		expect(result.success).toBe(false);
	});

	it("note が 1000 文字を超える場合はエラー", () => {
		const result = createShopSchema.safeParse({ name: "テスト", note: "あ".repeat(1001) });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "note");
			expect(err?.message).toBe("メモは1000文字以内で入力してください");
		}
	});
});

// ---------------------------------------------------------------------------
// updateShopSchema
// ---------------------------------------------------------------------------
describe("updateShopSchema", () => {
	it("一部フィールドのみの更新を受け入れる", () => {
		const result = updateShopSchema.safeParse({ name: "新しい店名" });
		expect(result.success).toBe(true);
	});

	it("全フィールドが optional でも最低1フィールドが必要", () => {
		const result = updateShopSchema.safeParse({});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("更新するフィールドを1つ以上指定してください");
		}
	});

	it("name を 100 文字以内で更新できる", () => {
		const result = updateShopSchema.safeParse({ name: "更新後の店名" });
		expect(result.success).toBe(true);
	});

	it("priceRange の部分更新を受け入れる", () => {
		const result = updateShopSchema.safeParse({ priceRange: "¥3,000〜¥5,999" });
		expect(result.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// shopListQuerySchema
// ---------------------------------------------------------------------------
describe("shopListQuerySchema", () => {
	it("空のクエリはデフォルト値を使用する", () => {
		const result = shopListQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sort).toBe("created_at");
			expect(result.data.order).toBe("desc");
		}
	});

	it("有効なソートとオーダーを受け入れる", () => {
		const result = shopListQuerySchema.safeParse({ sort: "name", order: "asc" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sort).toBe("name");
			expect(result.data.order).toBe("asc");
		}
	});

	it("無効な sort 値はエラー", () => {
		const result = shopListQuerySchema.safeParse({ sort: "updated_at" });
		expect(result.success).toBe(false);
	});

	it("無効な order 値はエラー", () => {
		const result = shopListQuerySchema.safeParse({ order: "random" });
		expect(result.success).toBe(false);
	});

	it("priceRange のフィルターを受け入れる", () => {
		const result = shopListQuerySchema.safeParse({ priceRange: "〜¥999" });
		expect(result.success).toBe(true);
	});

	it("tagId が UUID 形式でない場合はエラー", () => {
		const result = shopListQuerySchema.safeParse({ tagId: "not-uuid" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "tagId");
			expect(err?.message).toBe("tagId は UUID 形式で指定してください");
		}
	});
});

// ---------------------------------------------------------------------------
// placesSearchQuerySchema
// ---------------------------------------------------------------------------
describe("placesSearchQuerySchema", () => {
	it("有効な検索クエリを受け入れる", () => {
		const result = placesSearchQuerySchema.safeParse({ query: "渋谷 ランチ" });
		expect(result.success).toBe(true);
	});

	it("query が空文字の場合はエラー", () => {
		const result = placesSearchQuerySchema.safeParse({ query: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "query");
			expect(err?.message).toBe("検索キーワードは必須です");
		}
	});

	it("query が 200 文字を超える場合はエラー", () => {
		const result = placesSearchQuerySchema.safeParse({ query: "あ".repeat(201) });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "query");
			expect(err?.message).toBe("検索キーワードは200文字以内で入力してください");
		}
	});

	it("query の前後の空白が trim される", () => {
		const result = placesSearchQuerySchema.safeParse({ query: "  渋谷  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.query).toBe("渋谷");
		}
	});
});

// ---------------------------------------------------------------------------
// placesDetailsQuerySchema
// ---------------------------------------------------------------------------
describe("placesDetailsQuerySchema", () => {
	it("有効な placeId を受け入れる", () => {
		const result = placesDetailsQuerySchema.safeParse({ placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" });
		expect(result.success).toBe(true);
	});

	it("placeId が空文字の場合はエラー", () => {
		const result = placesDetailsQuerySchema.safeParse({ placeId: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "placeId");
			expect(err?.message).toBe("placeId は必須です");
		}
	});
});

// ---------------------------------------------------------------------------
// placesFromUrlSchema
// ---------------------------------------------------------------------------
describe("placesFromUrlSchema", () => {
	it("有効な URL を受け入れる", () => {
		const result = placesFromUrlSchema.safeParse({
			url: "https://maps.google.com/maps?q=test",
		});
		expect(result.success).toBe(true);
	});

	it("URL が空文字の場合はエラー", () => {
		const result = placesFromUrlSchema.safeParse({ url: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "url");
			expect(err?.message).toBe("URLは必須です");
		}
	});

	it("不正な URL の場合はエラー", () => {
		const result = placesFromUrlSchema.safeParse({ url: "not-a-url" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const err = result.error.issues.find((e) => e.path[0] === "url");
			expect(err?.message).toBe("正しいURL形式で入力してください");
		}
	});
});
