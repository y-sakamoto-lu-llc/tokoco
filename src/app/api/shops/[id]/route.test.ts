import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/db/queries/shops", () => ({
	getShopById: vi.fn(),
	updateShop: vi.fn(),
	deleteShop: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => {
	const actual = await importOriginal<typeof import("next/server")>();

	class MockNextResponse {
		status: number;
		_body: unknown;

		constructor(body: unknown, init?: ResponseInit) {
			this.status = init?.status ?? 200;
			this._body = body;
		}

		async json() {
			return this._body;
		}

		static json(body: unknown, init?: ResponseInit) {
			return new MockNextResponse(body, init);
		}
	}

	return {
		...actual,
		NextResponse: MockNextResponse,
	};
});

import { deleteShop, getShopById, updateShop } from "@/lib/db/queries/shops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DELETE, GET, PATCH } from "./route";

const MOCK_USER = { id: "user-uuid-1" };
const MOCK_SHOP_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const MOCK_SHOP = {
	id: MOCK_SHOP_ID,
	name: "テスト店舗",
	area: "渋谷",
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
	tags: [],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeMockSupabase(user: { id: string } | null = MOCK_USER) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user } }),
		},
	};
}

function makeContext(id: string = MOCK_SHOP_ID) {
	return { params: Promise.resolve({ id }) };
}

describe("GET /api/shops/[id]", () => {
	beforeEach(() => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase() as never);
		vi.mocked(getShopById).mockResolvedValue(MOCK_SHOP);
	});
	afterEach(() => vi.clearAllMocks());

	it("存在する店舗で200を返す", async () => {
		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`);
		const res = await GET(req, makeContext());

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.id).toBe(MOCK_SHOP_ID);
	});

	it("未認証で401を返す", async () => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase(null) as never);

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`);
		const res = await GET(req, makeContext());

		expect(res.status).toBe(401);
	});

	it("存在しない店舗（他ユーザー含む）で404を返す", async () => {
		vi.mocked(getShopById).mockResolvedValue(null);

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`);
		const res = await GET(req, makeContext());

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe("店舗が見つかりません");
	});

	it("DBエラーで500を返す", async () => {
		vi.mocked(getShopById).mockRejectedValue(new Error("DB error"));

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`);
		const res = await GET(req, makeContext());

		expect(res.status).toBe(500);
	});
});

describe("PATCH /api/shops/[id]", () => {
	beforeEach(() => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase() as never);
		vi.mocked(updateShop).mockResolvedValue({ ...MOCK_SHOP, name: "更新後店舗" });
	});
	afterEach(() => vi.clearAllMocks());

	it("正常なリクエストで200と更新後店舗を返す", async () => {
		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "更新後店舗" }),
		});
		const res = await PATCH(req, makeContext());

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.name).toBe("更新後店舗");
	});

	it("未認証で401を返す", async () => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase(null) as never);

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "更新後" }),
		});
		const res = await PATCH(req, makeContext());

		expect(res.status).toBe(401);
	});

	it("存在しない店舗で404を返す（RLS）", async () => {
		vi.mocked(updateShop).mockResolvedValue(null);

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "更新後" }),
		});
		const res = await PATCH(req, makeContext());

		expect(res.status).toBe(404);
	});

	it("空のボディで400を返す（updateShopSchema: 最低1フィールド必須）", async () => {
		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		const res = await PATCH(req, makeContext());

		expect(res.status).toBe(400);
	});

	it("不正なJSONで400を返す", async () => {
		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`, {
			method: "PATCH",
			body: "invalid-json",
		});
		const res = await PATCH(req, makeContext());

		expect(res.status).toBe(400);
	});
});

describe("DELETE /api/shops/[id]", () => {
	beforeEach(() => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase() as never);
		vi.mocked(deleteShop).mockResolvedValue(true);
	});
	afterEach(() => vi.clearAllMocks());

	it("正常な削除で204を返す", async () => {
		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`, { method: "DELETE" });
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(204);
	});

	it("未認証で401を返す", async () => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase(null) as never);

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`, { method: "DELETE" });
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(401);
	});

	it("存在しない店舗で404を返す", async () => {
		vi.mocked(deleteShop).mockResolvedValue(false);

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`, { method: "DELETE" });
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(404);
	});

	it("DBエラーで500を返す", async () => {
		vi.mocked(deleteShop).mockRejectedValue(new Error("DB error"));

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}`, { method: "DELETE" });
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(500);
	});
});
