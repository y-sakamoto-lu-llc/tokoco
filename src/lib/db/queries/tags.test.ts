/**
 * tags クエリ関数層の単体テスト
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// createDb のモック
const mockDb = {
	select: vi.fn(),
	insert: vi.fn(),
	delete: vi.fn(),
};

vi.mock("@/db/client", () => ({
	createDb: () => mockDb,
}));

vi.mock("@/db/schema", () => ({
	tags: { id: "id", userId: "userId", name: "name", createdAt: "createdAt" },
	shopTags: { id: "id", shopId: "shopId", tagId: "tagId" },
}));

vi.mock("drizzle-orm", () => ({
	and: (...args: unknown[]) => ({ type: "and", args }),
	eq: (col: unknown, val: unknown) => ({ type: "eq", col, val }),
	asc: (col: unknown) => ({ type: "asc", col }),
}));

import { createTag, deleteTag, getTagsByUserId } from "./tags";

const USER_ID = "user-uuid-1";
const TAG_ID = "tag-uuid-1";

describe("getTagsByUserId — shop_tags に参照されているタグのみ返す", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("タグ一覧を ISO 文字列で返す", async () => {
		const mockTags = [
			{ id: "tag-1", name: "和食", createdAt: new Date("2026-01-01") },
			{ id: "tag-2", name: "ランチ", createdAt: new Date("2026-01-02") },
		];

		const groupBy = vi.fn().mockResolvedValue(mockTags);
		const orderBy = vi.fn().mockReturnValue({ groupBy });
		const where = vi.fn().mockReturnValue({ orderBy });
		const innerJoin = vi.fn().mockReturnValue({ where });
		const from = vi.fn().mockReturnValue({ innerJoin });
		mockDb.select.mockReturnValue({ from });

		const result = await getTagsByUserId(USER_ID);

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe("tag-1");
		expect(result[0].name).toBe("和食");
		expect(result[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
	});

	it("タグがない場合は空配列を返す", async () => {
		const groupBy = vi.fn().mockResolvedValue([]);
		const orderBy = vi.fn().mockReturnValue({ groupBy });
		const where = vi.fn().mockReturnValue({ orderBy });
		const innerJoin = vi.fn().mockReturnValue({ where });
		const from = vi.fn().mockReturnValue({ innerJoin });
		mockDb.select.mockReturnValue({ from });

		const result = await getTagsByUserId(USER_ID);

		expect(result).toHaveLength(0);
	});
});

describe("createTag — 同名チェック", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("同名タグが存在しない場合はタグを作成して返す", async () => {
		// 同名チェック SELECT → 空
		const checkLimit = vi.fn().mockResolvedValue([]);
		const checkWhere = vi.fn().mockReturnValue({ limit: checkLimit });
		const checkFrom = vi.fn().mockReturnValue({ where: checkWhere });
		mockDb.select.mockReturnValue({ from: checkFrom });

		// INSERT
		const insertReturning = vi
			.fn()
			.mockResolvedValue([{ id: TAG_ID, name: "新タグ", createdAt: new Date("2026-01-01") }]);
		const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
		mockDb.insert.mockReturnValue({ values: insertValues });

		const result = await createTag(USER_ID, { name: "新タグ" });

		expect(result).not.toMatchObject({ type: "conflict" });
		if (!("type" in result)) {
			expect(result.id).toBe(TAG_ID);
			expect(result.name).toBe("新タグ");
		}
	});

	it("同名タグが存在する場合は { type: 'conflict', existingId } を返す", async () => {
		// 同名チェック SELECT → 既存あり
		const checkLimit = vi.fn().mockResolvedValue([{ id: "existing-tag" }]);
		const checkWhere = vi.fn().mockReturnValue({ limit: checkLimit });
		const checkFrom = vi.fn().mockReturnValue({ where: checkWhere });
		mockDb.select.mockReturnValue({ from: checkFrom });

		const result = await createTag(USER_ID, { name: "既存タグ" });

		expect(result).toMatchObject({ type: "conflict", existingId: "existing-tag" });
		expect(mockDb.insert).not.toHaveBeenCalled();
	});
});

describe("deleteTag — userId による所有確認", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("自分のタグを削除できる", async () => {
		const deleteReturning = vi.fn().mockResolvedValue([{ id: TAG_ID }]);
		const deleteWhere = vi.fn().mockReturnValue({ returning: deleteReturning });
		mockDb.delete.mockReturnValue({ where: deleteWhere });

		const result = await deleteTag(USER_ID, TAG_ID);

		expect(result).toBe(true);
	});

	it("タグが見つからない（他ユーザーのタグ等）場合は false を返す", async () => {
		const deleteReturning = vi.fn().mockResolvedValue([]);
		const deleteWhere = vi.fn().mockReturnValue({ returning: deleteReturning });
		mockDb.delete.mockReturnValue({ where: deleteWhere });

		const result = await deleteTag(USER_ID, TAG_ID);

		expect(result).toBe(false);
	});
});
