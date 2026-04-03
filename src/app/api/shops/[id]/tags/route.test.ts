import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/db/queries/shops", () => ({
	attachTagToShop: vi.fn(),
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

import { attachTagToShop } from "@/lib/db/queries/shops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POST } from "./route";

const MOCK_USER = { id: "user-uuid-1" };
const MOCK_SHOP_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const MOCK_TAG_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

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

function makeRequest(body: unknown) {
	return new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}/tags`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/shops/[id]/tags", () => {
	beforeEach(() => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase() as never);
		vi.mocked(attachTagToShop).mockResolvedValue({ shopId: MOCK_SHOP_ID, tagId: MOCK_TAG_ID });
	});
	afterEach(() => vi.clearAllMocks());

	it("正常なリクエストで201とshopId/tagIdを返す", async () => {
		const req = makeRequest({ tagId: MOCK_TAG_ID });
		const res = await POST(req, makeContext());

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.shopId).toBe(MOCK_SHOP_ID);
		expect(body.tagId).toBe(MOCK_TAG_ID);
	});

	it("未認証で401を返す", async () => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase(null) as never);

		const req = makeRequest({ tagId: MOCK_TAG_ID });
		const res = await POST(req, makeContext());

		expect(res.status).toBe(401);
	});

	it("shop が見つからない場合は404を返す", async () => {
		vi.mocked(attachTagToShop).mockResolvedValue("shop_not_found");

		const req = makeRequest({ tagId: MOCK_TAG_ID });
		const res = await POST(req, makeContext());

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe("店舗が見つかりません");
	});

	it("tag が見つからない場合は404を返す", async () => {
		vi.mocked(attachTagToShop).mockResolvedValue("tag_not_found");

		const req = makeRequest({ tagId: MOCK_TAG_ID });
		const res = await POST(req, makeContext());

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe("タグが見つかりません");
	});

	it("重複付与の場合は409を返す", async () => {
		vi.mocked(attachTagToShop).mockResolvedValue("conflict");

		const req = makeRequest({ tagId: MOCK_TAG_ID });
		const res = await POST(req, makeContext());

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.error).toBe("このタグはすでに付与されています");
	});

	it("不正なtagId（UUID形式でない）で400を返す", async () => {
		const req = makeRequest({ tagId: "not-a-uuid" });
		const res = await POST(req, makeContext());

		expect(res.status).toBe(400);
	});

	it("tagIdなしで400を返す", async () => {
		const req = makeRequest({});
		const res = await POST(req, makeContext());

		expect(res.status).toBe(400);
	});

	it("不正なJSONで400を返す", async () => {
		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}/tags`, {
			method: "POST",
			body: "invalid-json",
		});
		const res = await POST(req, makeContext());

		expect(res.status).toBe(400);
	});
});
