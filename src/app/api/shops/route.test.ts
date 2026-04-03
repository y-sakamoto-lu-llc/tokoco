import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// createSupabaseServerClient のモック
vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: vi.fn(),
}));

// DB クエリ関数のモック
vi.mock("@/lib/db/queries/shops", () => ({
	getShopsByUserId: vi.fn(),
	createShop: vi.fn(),
}));

// next/server の NextResponse をモック
vi.mock("next/server", async (importOriginal) => {
	const actual = await importOriginal<typeof import("next/server")>();
	return {
		...actual,
		NextResponse: {
			...actual.NextResponse,
			json: (body: unknown, init?: ResponseInit) => ({
				status: init?.status ?? 200,
				json: async () => body,
			}),
		},
	};
});

import { createShop, getShopsByUserId } from "@/lib/db/queries/shops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GET, POST } from "./route";

const MOCK_USER = { id: "user-uuid-1" };

function makeMockSupabase(user: { id: string } | null = MOCK_USER) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user } }),
		},
	};
}

function makeGetRequest(params?: Record<string, string>) {
	const url = new URL("http://localhost/api/shops");
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			url.searchParams.set(k, v);
		}
	}
	return new Request(url.toString(), { method: "GET" });
}

function makePostRequest(body: unknown) {
	return new Request("http://localhost/api/shops", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

const MOCK_SHOP_LIST_RESULT = {
	items: [
		{
			id: "shop-1",
			name: "テスト店舗",
			area: "渋谷",
			category: "ラーメン",
			priceRange: "〜¥999",
			photoUrl: null,
			tags: [],
			createdAt: "2026-01-01T00:00:00.000Z",
		},
	],
	total: 1,
};

const MOCK_SHOP_DETAIL = {
	id: "shop-1",
	name: "テスト店舗",
	area: "渋谷",
	address: null,
	phone: null,
	category: "ラーメン",
	priceRange: "〜¥999",
	externalRating: null,
	businessHours: null,
	websiteUrl: null,
	googleMapsUrl: null,
	sourceUrl: null,
	photoUrl: null,
	note: null,
	tags: [],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("GET /api/shops", () => {
	beforeEach(() => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase() as never);
		vi.mocked(getShopsByUserId).mockResolvedValue(MOCK_SHOP_LIST_RESULT);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("認証済みユーザーで200と店舗一覧を返す", async () => {
		const req = makeGetRequest();
		const res = await GET(req);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(1);
		expect(body.total).toBe(1);
	});

	it("未認証の場合は401を返す", async () => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase(null) as never);

		const req = makeGetRequest();
		const res = await GET(req);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe("ログインが必要です");
	});

	it("フィルタパラメータを正しくクエリ関数に渡す", async () => {
		const req = makeGetRequest({
			category: "ラーメン",
			sort: "name",
			order: "asc",
		});
		await GET(req);

		expect(getShopsByUserId).toHaveBeenCalledWith(
			MOCK_USER.id,
			expect.objectContaining({
				category: "ラーメン",
				sort: "name",
				order: "asc",
			})
		);
	});

	it("不正なtagIdで400を返す", async () => {
		const req = makeGetRequest({ tagId: "not-a-uuid" });
		const res = await GET(req);

		expect(res.status).toBe(400);
	});

	it("不正なsortパラメータで400を返す", async () => {
		const req = makeGetRequest({ sort: "invalid" });
		const res = await GET(req);

		expect(res.status).toBe(400);
	});

	it("DBエラーで500を返す", async () => {
		vi.mocked(getShopsByUserId).mockRejectedValue(new Error("DB error"));

		const req = makeGetRequest();
		const res = await GET(req);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBe("内部エラーが発生しました");
	});
});

describe("POST /api/shops", () => {
	beforeEach(() => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase() as never);
		vi.mocked(createShop).mockResolvedValue(MOCK_SHOP_DETAIL);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("正常なリクエストで201と作成店舗を返す", async () => {
		const req = makePostRequest({ name: "新店舗" });
		const res = await POST(req);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.id).toBe("shop-1");
		expect(body.name).toBe("テスト店舗");
	});

	it("user_id は JWT から取得し、クライアントの値を使わない", async () => {
		const req = makePostRequest({ name: "新店舗" });
		await POST(req);

		expect(createShop).toHaveBeenCalledWith(MOCK_USER.id, expect.any(Object));
	});

	it("未認証の場合は401を返す", async () => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase(null) as never);

		const req = makePostRequest({ name: "新店舗" });
		const res = await POST(req);

		expect(res.status).toBe(401);
	});

	it("店舗名なしで400を返す", async () => {
		const req = makePostRequest({ name: "" });
		const res = await POST(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.errors?.name).toBeDefined();
	});

	it("不正なJSONで400を返す", async () => {
		const req = new Request("http://localhost/api/shops", {
			method: "POST",
			body: "invalid-json",
		});
		const res = await POST(req);

		expect(res.status).toBe(400);
	});

	it("不正なpriceRangeで400を返す", async () => {
		const req = makePostRequest({ name: "店舗", priceRange: "invalid" });
		const res = await POST(req);

		expect(res.status).toBe(400);
	});

	it("DBエラーで500を返す", async () => {
		vi.mocked(createShop).mockRejectedValue(new Error("DB error"));

		const req = makePostRequest({ name: "新店舗" });
		const res = await POST(req);

		expect(res.status).toBe(500);
	});
});
