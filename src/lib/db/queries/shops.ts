/**
 * Drizzle ORM query functions for shops
 */
import { createDb } from "@/db/client";
import { shopTags, shops, tags } from "@/db/schema";
import type { CreateShopInput, ShopListQuery, UpdateShopInput } from "@/lib/validations/shop";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

export type ShopWithTags = {
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

export type ShopListItem = {
	id: string;
	name: string;
	area: string | null;
	category: string | null;
	priceRange: string | null;
	photoUrl: string | null;
	tags: { id: string; name: string }[];
	createdAt: string;
};

function toShopWithTags(
	row: typeof shops.$inferSelect,
	tagRows: { id: string; name: string }[]
): ShopWithTags {
	return {
		id: row.id,
		name: row.name,
		area: row.area ?? null,
		address: row.address ?? null,
		phone: row.phone ?? null,
		category: row.category ?? null,
		priceRange: row.priceRange ?? null,
		externalRating: row.externalRating != null ? Number(row.externalRating) : null,
		businessHours: row.businessHours ?? null,
		websiteUrl: row.websiteUrl ?? null,
		googleMapsUrl: row.googleMapsUrl ?? null,
		sourceUrl: row.sourceUrl ?? null,
		photoUrl: row.photoUrl ?? null,
		note: row.note ?? null,
		tags: tagRows,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

/**
 * 店舗一覧取得（フィルタ・ソート対応）
 */
export async function getShopsByUserId(
	userId: string,
	query: ShopListQuery
): Promise<{ items: ShopListItem[]; total: number }> {
	const db = createDb();

	const conditions = [eq(shops.userId, userId)];
	if (query.category) {
		conditions.push(eq(shops.category, query.category));
	}
	if (query.priceRange) {
		conditions.push(eq(shops.priceRange, query.priceRange));
	}
	if (query.area) {
		conditions.push(eq(shops.area, query.area));
	}

	// tagId フィルタ: shop_tags に該当 tagId が存在する shop のみ
	if (query.tagId) {
		const shopIdsWithTag = db
			.select({ shopId: shopTags.shopId })
			.from(shopTags)
			.where(eq(shopTags.tagId, query.tagId));

		const shopIdRows = await shopIdsWithTag;
		const shopIds = shopIdRows.map((r) => r.shopId);
		if (shopIds.length === 0) {
			return { items: [], total: 0 };
		}
		conditions.push(inArray(shops.id, shopIds));
	}

	const orderFn = query.order === "asc" ? asc : desc;
	const sortCol = query.sort === "name" ? shops.name : shops.createdAt;

	const rows = await db
		.select()
		.from(shops)
		.where(and(...conditions))
		.orderBy(orderFn(sortCol));

	const total = rows.length;

	if (total === 0) {
		return { items: [], total: 0 };
	}

	// タグを一括取得
	const shopIds = rows.map((r) => r.id);
	const tagRows = await db
		.select({
			shopId: shopTags.shopId,
			tagId: tags.id,
			tagName: tags.name,
		})
		.from(shopTags)
		.innerJoin(tags, eq(shopTags.tagId, tags.id))
		.where(inArray(shopTags.shopId, shopIds));

	const tagsByShopId = new Map<string, { id: string; name: string }[]>();
	for (const t of tagRows) {
		const existing = tagsByShopId.get(t.shopId) ?? [];
		existing.push({ id: t.tagId, name: t.tagName });
		tagsByShopId.set(t.shopId, existing);
	}

	const items: ShopListItem[] = rows.map((row) => ({
		id: row.id,
		name: row.name,
		area: row.area ?? null,
		category: row.category ?? null,
		priceRange: row.priceRange ?? null,
		photoUrl: row.photoUrl ?? null,
		tags: tagsByShopId.get(row.id) ?? [],
		createdAt: row.createdAt.toISOString(),
	}));

	return { items, total };
}

/**
 * 店舗詳細取得（タグ含む）
 */
export async function getShopById(userId: string, shopId: string): Promise<ShopWithTags | null> {
	const db = createDb();

	const rows = await db
		.select()
		.from(shops)
		.where(and(eq(shops.id, shopId), eq(shops.userId, userId)))
		.limit(1);

	if (rows.length === 0) {
		return null;
	}

	const shop = rows[0];
	const tagRows = await db
		.select({ id: tags.id, name: tags.name })
		.from(shopTags)
		.innerJoin(tags, eq(shopTags.tagId, tags.id))
		.where(eq(shopTags.shopId, shopId));

	return toShopWithTags(shop, tagRows);
}

/**
 * 店舗登録
 */
export async function createShop(userId: string, input: CreateShopInput): Promise<ShopWithTags> {
	const db = createDb();

	const { tagIds, ...shopData } = input;

	const inserted = await db
		.insert(shops)
		.values({
			userId,
			name: shopData.name,
			area: shopData.area ?? null,
			address: shopData.address ?? null,
			phone: shopData.phone ?? null,
			category: shopData.category ?? null,
			priceRange: shopData.priceRange ?? null,
			externalRating: shopData.externalRating != null ? String(shopData.externalRating) : null,
			businessHours: shopData.businessHours ?? null,
			websiteUrl: shopData.websiteUrl ?? null,
			googleMapsUrl: shopData.googleMapsUrl ?? null,
			sourceUrl: shopData.sourceUrl ?? null,
			photoUrl: shopData.photoUrl ?? null,
			note: shopData.note ?? null,
		})
		.returning();

	const shop = inserted[0];

	// タグ付与（所有者確認あり: userId が一致するタグのみ）
	let tagRows: { id: string; name: string }[] = [];
	if (tagIds && tagIds.length > 0) {
		// userId で所有者確認してから取得
		const ownedTags = await db
			.select({ id: tags.id, name: tags.name })
			.from(tags)
			.where(and(inArray(tags.id, tagIds), eq(tags.userId, userId)));

		if (ownedTags.length > 0) {
			await db
				.insert(shopTags)
				.values(ownedTags.map((tag) => ({ shopId: shop.id, tagId: tag.id })));
			tagRows = ownedTags;
		}
	}

	return toShopWithTags(shop, tagRows);
}

/**
 * 店舗更新
 */
export async function updateShop(
	userId: string,
	shopId: string,
	input: UpdateShopInput
): Promise<ShopWithTags | null> {
	const db = createDb();

	// tagIds は別途処理するので除外
	const { tagIds: _tagIds, ...shopData } = input;

	const updateValues: Partial<typeof shops.$inferInsert> = {};
	if (shopData.name !== undefined) updateValues.name = shopData.name;
	if (shopData.area !== undefined) updateValues.area = shopData.area ?? null;
	if (shopData.address !== undefined) updateValues.address = shopData.address ?? null;
	if (shopData.phone !== undefined) updateValues.phone = shopData.phone ?? null;
	if (shopData.category !== undefined) updateValues.category = shopData.category ?? null;
	if (shopData.priceRange !== undefined) updateValues.priceRange = shopData.priceRange ?? null;
	if (shopData.externalRating !== undefined)
		updateValues.externalRating =
			shopData.externalRating != null ? String(shopData.externalRating) : null;
	if (shopData.businessHours !== undefined)
		updateValues.businessHours = shopData.businessHours ?? null;
	if (shopData.websiteUrl !== undefined) updateValues.websiteUrl = shopData.websiteUrl ?? null;
	if (shopData.googleMapsUrl !== undefined)
		updateValues.googleMapsUrl = shopData.googleMapsUrl ?? null;
	if (shopData.sourceUrl !== undefined) updateValues.sourceUrl = shopData.sourceUrl ?? null;
	if (shopData.photoUrl !== undefined) updateValues.photoUrl = shopData.photoUrl ?? null;
	if (shopData.note !== undefined) updateValues.note = shopData.note ?? null;

	updateValues.updatedAt = new Date();

	const updated = await db
		.update(shops)
		.set(updateValues)
		.where(and(eq(shops.id, shopId), eq(shops.userId, userId)))
		.returning();

	if (updated.length === 0) {
		return null;
	}

	const shop = updated[0];
	const tagRows = await db
		.select({ id: tags.id, name: tags.name })
		.from(shopTags)
		.innerJoin(tags, eq(shopTags.tagId, tags.id))
		.where(eq(shopTags.shopId, shopId));

	return toShopWithTags(shop, tagRows);
}

/**
 * 店舗削除（使用ゼロのタグも自動削除）
 */
export async function deleteShop(userId: string, shopId: string): Promise<boolean> {
	const db = createDb();

	// 削除前にこの店舗が使用しているタグIDを記録（userId で所有確認）
	const usedTagIds = await db
		.select({ tagId: shopTags.tagId })
		.from(shopTags)
		.innerJoin(shops, eq(shopTags.shopId, shops.id))
		.where(and(eq(shopTags.shopId, shopId), eq(shops.userId, userId)));

	const deleted = await db
		.delete(shops)
		.where(and(eq(shops.id, shopId), eq(shops.userId, userId)))
		.returning();

	if (deleted.length === 0) {
		return false;
	}

	// 使用店舗数がゼロになったタグを自動削除（SHOP-13）
	if (usedTagIds.length > 0) {
		const tagIds = usedTagIds.map((r) => r.tagId);
		// shop_tags にまだ参照されているタグIDを取得
		const stillUsed = await db
			.select({ tagId: shopTags.tagId })
			.from(shopTags)
			.where(inArray(shopTags.tagId, tagIds));

		const stillUsedIds = new Set(stillUsed.map((r) => r.tagId));
		const orphanTagIds = tagIds.filter((id) => !stillUsedIds.has(id));

		if (orphanTagIds.length > 0) {
			await db.delete(tags).where(inArray(tags.id, orphanTagIds));
		}
	}

	return true;
}

/**
 * 店舗にタグを付与
 */
export async function attachTagToShop(
	userId: string,
	shopId: string,
	tagId: string
): Promise<{ shopId: string; tagId: string } | "shop_not_found" | "tag_not_found" | "conflict"> {
	const db = createDb();

	// 店舗の所有確認
	const shopRows = await db
		.select({ id: shops.id })
		.from(shops)
		.where(and(eq(shops.id, shopId), eq(shops.userId, userId)))
		.limit(1);
	if (shopRows.length === 0) return "shop_not_found";

	// タグの所有確認
	const tagRows = await db
		.select({ id: tags.id })
		.from(tags)
		.where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
		.limit(1);
	if (tagRows.length === 0) return "tag_not_found";

	// 重複確認
	const existing = await db
		.select({ id: shopTags.id })
		.from(shopTags)
		.where(and(eq(shopTags.shopId, shopId), eq(shopTags.tagId, tagId)))
		.limit(1);
	if (existing.length > 0) return "conflict";

	await db.insert(shopTags).values({ shopId, tagId });
	return { shopId, tagId };
}

/**
 * 店舗からタグを外す（使用ゼロのタグも自動削除）
 */
export async function detachTagFromShop(
	userId: string,
	shopId: string,
	tagId: string
): Promise<boolean> {
	const db = createDb();

	// 店舗の所有確認
	const shopRows = await db
		.select({ id: shops.id })
		.from(shops)
		.where(and(eq(shops.id, shopId), eq(shops.userId, userId)))
		.limit(1);
	if (shopRows.length === 0) return false;

	const deleted = await db
		.delete(shopTags)
		.where(and(eq(shopTags.shopId, shopId), eq(shopTags.tagId, tagId)))
		.returning();

	if (deleted.length === 0) {
		return false;
	}

	// タグの使用店舗数がゼロになった場合は自動削除（SHOP-13）
	const stillUsed = await db
		.select({ id: shopTags.id })
		.from(shopTags)
		.where(eq(shopTags.tagId, tagId))
		.limit(1);

	if (stillUsed.length === 0) {
		await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.userId, userId)));
	}

	return true;
}

/**
 * SQL カウント用ヘルパー
 */
export const countSql = sql<number>`count(*)`.mapWith(Number);
