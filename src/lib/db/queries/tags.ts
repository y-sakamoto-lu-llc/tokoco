/**
 * Drizzle ORM query functions for tags
 */
import { createDb } from "@/db/client";
import { shopTags, tags } from "@/db/schema";
import type { CreateTagInput } from "@/lib/validations/tag";
import { and, asc, eq } from "drizzle-orm";

export type TagItem = {
	id: string;
	name: string;
	createdAt: string;
};

/**
 * ユーザーのタグ一覧取得（名前昇順）
 * SHOP-13: 使用店舗数がゼロのタグは返さない
 */
export async function getTagsByUserId(userId: string): Promise<TagItem[]> {
	const db = createDb();

	// shop_tags に参照されているタグのみ返す（SHOP-13）
	const rows = await db
		.select({ id: tags.id, name: tags.name, createdAt: tags.createdAt })
		.from(tags)
		.innerJoin(shopTags, eq(tags.id, shopTags.tagId))
		.where(eq(tags.userId, userId))
		.orderBy(asc(tags.name))
		.groupBy(tags.id, tags.name, tags.createdAt);

	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		createdAt: row.createdAt.toISOString(),
	}));
}

/**
 * タグ作成
 * 同名タグが存在する場合は "conflict" を返す
 */
export async function createTag(
	userId: string,
	input: CreateTagInput
): Promise<TagItem | "conflict"> {
	const db = createDb();

	// 同名チェック
	const existing = await db
		.select({ id: tags.id })
		.from(tags)
		.where(and(eq(tags.userId, userId), eq(tags.name, input.name)))
		.limit(1);

	if (existing.length > 0) {
		return "conflict";
	}

	const inserted = await db.insert(tags).values({ userId, name: input.name }).returning();

	const tag = inserted[0];
	return {
		id: tag.id,
		name: tag.name,
		createdAt: tag.createdAt.toISOString(),
	};
}

/**
 * タグ削除
 * 対象タグが見つからない場合は false を返す
 */
export async function deleteTag(userId: string, tagId: string): Promise<boolean> {
	const db = createDb();

	const deleted = await db
		.delete(tags)
		.where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
		.returning();

	return deleted.length > 0;
}
