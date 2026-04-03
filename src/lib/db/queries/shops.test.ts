/**
 * クエリ関数層の単体テスト
 * DB クライアントをモックし、孤立タグ削除ロジックの動作を検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// createDb のモック
const mockDb = {
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
};

vi.mock("@/db/client", () => ({
	createDb: () => mockDb,
}));

vi.mock("@/db/schema", () => ({
	shops: {
		id: "id",
		userId: "userId",
		name: "name",
		createdAt: "createdAt",
		updatedAt: "updatedAt",
	},
	tags: { id: "id", userId: "userId", name: "name", createdAt: "createdAt" },
	shopTags: { id: "id", shopId: "shopId", tagId: "tagId" },
}));

// Drizzle ORM の関数をモック（パススルー）
vi.mock("drizzle-orm", () => ({
	and: (...args: unknown[]) => ({ type: "and", args }),
	eq: (col: unknown, val: unknown) => ({ type: "eq", col, val }),
	inArray: (col: unknown, vals: unknown) => ({ type: "inArray", col, vals }),
	asc: (col: unknown) => ({ type: "asc", col }),
	desc: (col: unknown) => ({ type: "desc", col }),
	sql: Object.assign(
		(strings: TemplateStringsArray, ...vals: unknown[]) => ({
			mapWith: (fn: unknown) => ({ type: "sql", fn }),
		}),
		{ mapWith: vi.fn() }
	),
}));

import { createShop, deleteShop, detachTagFromShop } from "./shops";

/**
 * Drizzle クエリビルダーの汎用モックチェーンを生成する
 * チェーンの末尾メソッドが Promise を解決する形で設計している
 */
function makeChain(resolveValue: unknown) {
	const resolved = Promise.resolve(resolveValue);
	const chain: Record<string, (...args: unknown[]) => unknown> = {};
	// 中間チェーンメソッド（自身を返す）
	const chainMethods = ["from", "where", "innerJoin", "values", "set"];
	for (const m of chainMethods) {
		chain[m] = vi.fn(() => chain);
	}
	// 末尾メソッド（Promise を返す）
	const terminalMethods = ["returning", "limit", "orderBy", "groupBy"];
	for (const m of terminalMethods) {
		chain[m] = vi.fn(() => resolved);
	}
	// select / insert / delete / update 自体がチェーンを返すため chain として扱う
	// ただし await で直接解決できるよう Symbol.toStringTag を指定しない点に注意
	// → 呼び出し元が直接 await する場合は resolved を返す
	chain.__resolved = resolved as unknown as (...args: unknown[]) => unknown;
	return chain;
}

const USER_ID = "user-uuid-1";
const SHOP_ID = "shop-uuid-1";
const TAG_ID_A = "tag-uuid-a";
const TAG_ID_B = "tag-uuid-b";

const MOCK_SHOP_ROW = {
	id: SHOP_ID,
	userId: USER_ID,
	name: "テスト店舗",
	area: null,
	address: null,
	phone: null,
	category: null,
	priceRange: null,
	externalRating: null,
	businessHours: null,
	websiteUrl: null,
	googleMapsUrl: null,
	sourceUrl: null,
	photoUrl: null,
	note: null,
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
};

describe("createShop — tagIds の所有者確認", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("自分のタグのみを shop_tags に INSERT する", async () => {
		// shops INSERT: insert().values().returning() → 店舗行を返す
		const shopInsertReturning = vi.fn().mockResolvedValue([MOCK_SHOP_ROW]);
		const shopInsertValues = vi.fn().mockReturnValue({ returning: shopInsertReturning });

		// shop_tags INSERT: insert().values() → Promise 解決
		const shopTagsInsertValues = vi.fn().mockResolvedValue([]);

		// owned tags SELECT: select().from().where() → 所有タグを返す（TAG_ID_A のみ）
		const ownedTagsWhere = vi.fn().mockResolvedValue([{ id: TAG_ID_A, name: "和食" }]);
		const ownedTagsFrom = vi.fn().mockReturnValue({ where: ownedTagsWhere });
		const ownedTagsSelect = vi.fn().mockReturnValue({ from: ownedTagsFrom });

		let insertCallCount = 0;
		mockDb.insert.mockImplementation(() => {
			insertCallCount++;
			if (insertCallCount === 1) {
				return { values: shopInsertValues };
			}
			return { values: shopTagsInsertValues };
		});
		mockDb.select.mockImplementation(() => ({ from: ownedTagsFrom }));
		// select のモックを差し替え（ownedTagsSelect と同一）
		mockDb.select.mockReturnValue({ from: ownedTagsFrom });

		await createShop(USER_ID, {
			name: "テスト店舗",
			tagIds: [TAG_ID_A, TAG_ID_B],
		});

		// shops INSERT と shop_tags INSERT の2回
		expect(insertCallCount).toBe(2);
		// 所有タグ確認のSELECTが呼ばれていること
		expect(mockDb.select).toHaveBeenCalled();
	});

	it("tagIds が空の場合は所有者確認・INSERT をスキップする", async () => {
		const shopInsertReturning = vi.fn().mockResolvedValue([MOCK_SHOP_ROW]);
		const shopInsertValues = vi.fn().mockReturnValue({ returning: shopInsertReturning });

		mockDb.insert.mockReturnValue({ values: shopInsertValues });

		await createShop(USER_ID, { name: "タグなし店舗" });

		// 店舗 INSERT のみ（shop_tags INSERT は呼ばれない）
		expect(mockDb.insert).toHaveBeenCalledTimes(1);
		// SELECT も呼ばれない（tagIds が空）
		expect(mockDb.select).not.toHaveBeenCalled();
	});
});

describe("deleteShop — 孤立タグ削除の userId フィルタ", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("shops を JOIN して userId を確認した上でタグIDを収集する", async () => {
		// 1回目 select: shop_tags JOIN shops で使用タグ取得 → [TAG_ID_A]
		const usedTagsWhere = vi.fn().mockResolvedValue([{ tagId: TAG_ID_A }]);
		const usedTagsInnerJoin = vi.fn().mockReturnValue({ where: usedTagsWhere });
		const usedTagsFrom = vi.fn().mockReturnValue({ innerJoin: usedTagsInnerJoin });

		// 2回目 select: shop_tags で残存参照確認 → なし
		const stillUsedWhere = vi.fn().mockResolvedValue([]);
		const stillUsedFrom = vi.fn().mockReturnValue({ where: stillUsedWhere });

		let selectCallCount = 0;
		mockDb.select.mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 1) return { from: usedTagsFrom };
			return { from: stillUsedFrom };
		});

		// shops DELETE: delete().where().returning() → 削除行を返す
		const shopDeleteReturning = vi.fn().mockResolvedValue([MOCK_SHOP_ROW]);
		const shopDeleteWhere = vi.fn().mockReturnValue({ returning: shopDeleteReturning });

		// tags DELETE: delete().where() → Promise 解決
		const tagDeleteWhere = vi.fn().mockResolvedValue([]);

		let deleteCallCount = 0;
		mockDb.delete.mockImplementation(() => {
			deleteCallCount++;
			if (deleteCallCount === 1) return { where: shopDeleteWhere };
			return { where: tagDeleteWhere };
		});

		const result = await deleteShop(USER_ID, SHOP_ID);

		expect(result).toBe(true);
		expect(selectCallCount).toBe(2);
		expect(deleteCallCount).toBe(2);
	});

	it("店舗が見つからない場合（DELETE 結果が空）は false を返す", async () => {
		// 使用タグ取得（空）
		const usedTagsWhere = vi.fn().mockResolvedValue([]);
		const usedTagsInnerJoin = vi.fn().mockReturnValue({ where: usedTagsWhere });
		const usedTagsFrom = vi.fn().mockReturnValue({ innerJoin: usedTagsInnerJoin });
		mockDb.select.mockReturnValue({ from: usedTagsFrom });

		// shops DELETE → 0件（他ユーザーの店舗）
		const deleteReturning = vi.fn().mockResolvedValue([]);
		const deleteWhere = vi.fn().mockReturnValue({ returning: deleteReturning });
		mockDb.delete.mockReturnValue({ where: deleteWhere });

		const result = await deleteShop(USER_ID, SHOP_ID);

		expect(result).toBe(false);
	});

	it("タグが他の店舗でも使われている場合は孤立タグを削除しない", async () => {
		// 使用タグ取得（TAG_ID_A）
		const usedTagsWhere = vi.fn().mockResolvedValue([{ tagId: TAG_ID_A }]);
		const usedTagsInnerJoin = vi.fn().mockReturnValue({ where: usedTagsWhere });
		const usedTagsFrom = vi.fn().mockReturnValue({ innerJoin: usedTagsInnerJoin });

		// TAG_ID_A はまだ別店舗で参照中
		const stillUsedWhere = vi.fn().mockResolvedValue([{ tagId: TAG_ID_A }]);
		const stillUsedFrom = vi.fn().mockReturnValue({ where: stillUsedWhere });

		let selectCallCount = 0;
		mockDb.select.mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 1) return { from: usedTagsFrom };
			return { from: stillUsedFrom };
		});

		// shops DELETE 成功
		const shopDeleteReturning = vi.fn().mockResolvedValue([MOCK_SHOP_ROW]);
		const shopDeleteWhere = vi.fn().mockReturnValue({ returning: shopDeleteReturning });

		let deleteCallCount = 0;
		mockDb.delete.mockImplementation(() => {
			deleteCallCount++;
			return { where: shopDeleteWhere };
		});

		const result = await deleteShop(USER_ID, SHOP_ID);

		expect(result).toBe(true);
		// shops の DELETE のみ（tags DELETE は呼ばれない）
		expect(deleteCallCount).toBe(1);
	});
});

describe("detachTagFromShop — 孤立タグ削除の userId 確認", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("他の店舗で使われていないタグを userId 付きで削除する", async () => {
		// 1回目 select: 店舗所有確認 → 存在
		const shopCheckLimit = vi.fn().mockResolvedValue([{ id: SHOP_ID }]);
		const shopCheckWhere = vi.fn().mockReturnValue({ limit: shopCheckLimit });
		const shopCheckFrom = vi.fn().mockReturnValue({ where: shopCheckWhere });

		// 2回目 select: タグの残存参照確認 → ゼロ
		const stillUsedLimit = vi.fn().mockResolvedValue([]);
		const stillUsedWhere = vi.fn().mockReturnValue({ limit: stillUsedLimit });
		const stillUsedFrom = vi.fn().mockReturnValue({ where: stillUsedWhere });

		let selectCallCount = 0;
		mockDb.select.mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 1) return { from: shopCheckFrom };
			return { from: stillUsedFrom };
		});

		// 1回目 delete: shop_tags から外す → 削除行あり
		const shopTagDeleteReturning = vi
			.fn()
			.mockResolvedValue([{ id: "st-1", shopId: SHOP_ID, tagId: TAG_ID_A }]);
		const shopTagDeleteWhere = vi.fn().mockReturnValue({ returning: shopTagDeleteReturning });

		// 2回目 delete: タグ削除
		const tagDeleteWhere = vi.fn().mockResolvedValue([]);

		let deleteCallCount = 0;
		mockDb.delete.mockImplementation(() => {
			deleteCallCount++;
			if (deleteCallCount === 1) return { where: shopTagDeleteWhere };
			return { where: tagDeleteWhere };
		});

		const result = await detachTagFromShop(USER_ID, SHOP_ID, TAG_ID_A);

		expect(result).toBe(true);
		// shop_tags DELETE + tags DELETE の2回
		expect(deleteCallCount).toBe(2);
	});

	it("他の店舗でまだ使われているタグは削除しない", async () => {
		// 店舗所有確認 → 存在
		const shopCheckLimit = vi.fn().mockResolvedValue([{ id: SHOP_ID }]);
		const shopCheckWhere = vi.fn().mockReturnValue({ limit: shopCheckLimit });
		const shopCheckFrom = vi.fn().mockReturnValue({ where: shopCheckWhere });

		// タグは他店舗でまだ参照中
		const stillUsedLimit = vi.fn().mockResolvedValue([{ id: "st-2" }]);
		const stillUsedWhere = vi.fn().mockReturnValue({ limit: stillUsedLimit });
		const stillUsedFrom = vi.fn().mockReturnValue({ where: stillUsedWhere });

		let selectCallCount = 0;
		mockDb.select.mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 1) return { from: shopCheckFrom };
			return { from: stillUsedFrom };
		});

		// shop_tags から外す → 削除行あり
		const shopTagDeleteReturning = vi
			.fn()
			.mockResolvedValue([{ id: "st-1", shopId: SHOP_ID, tagId: TAG_ID_A }]);
		const shopTagDeleteWhere = vi.fn().mockReturnValue({ returning: shopTagDeleteReturning });

		let deleteCallCount = 0;
		mockDb.delete.mockImplementation(() => {
			deleteCallCount++;
			return { where: shopTagDeleteWhere };
		});

		const result = await detachTagFromShop(USER_ID, SHOP_ID, TAG_ID_A);

		expect(result).toBe(true);
		// shop_tags の DELETE のみ（tags DELETE は呼ばれない）
		expect(deleteCallCount).toBe(1);
	});

	it("店舗が見つからない場合は false を返し DELETE を呼ばない", async () => {
		// 店舗所有確認 → 空（他ユーザーの店舗）
		const shopCheckLimit = vi.fn().mockResolvedValue([]);
		const shopCheckWhere = vi.fn().mockReturnValue({ limit: shopCheckLimit });
		const shopCheckFrom = vi.fn().mockReturnValue({ where: shopCheckWhere });
		mockDb.select.mockReturnValue({ from: shopCheckFrom });

		const result = await detachTagFromShop(USER_ID, SHOP_ID, TAG_ID_A);

		expect(result).toBe(false);
		expect(mockDb.delete).not.toHaveBeenCalled();
	});

	it("shop_tags に紐付けがない場合は false を返す", async () => {
		// 店舗所有確認 → 存在
		const shopCheckLimit = vi.fn().mockResolvedValue([{ id: SHOP_ID }]);
		const shopCheckWhere = vi.fn().mockReturnValue({ limit: shopCheckLimit });
		const shopCheckFrom = vi.fn().mockReturnValue({ where: shopCheckWhere });
		mockDb.select.mockReturnValue({ from: shopCheckFrom });

		// shop_tags 削除 → 0件（紐付けがない）
		const shopTagDeleteReturning = vi.fn().mockResolvedValue([]);
		const shopTagDeleteWhere = vi.fn().mockReturnValue({ returning: shopTagDeleteReturning });

		let deleteCallCount = 0;
		mockDb.delete.mockImplementation(() => {
			deleteCallCount++;
			return { where: shopTagDeleteWhere };
		});

		const result = await detachTagFromShop(USER_ID, SHOP_ID, TAG_ID_A);

		expect(result).toBe(false);
		// タグ削除は呼ばれない
		expect(deleteCallCount).toBe(1);
	});
});
