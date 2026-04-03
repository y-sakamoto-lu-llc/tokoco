import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/db/queries/shops", () => ({
	detachTagFromShop: vi.fn(),
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

import { detachTagFromShop } from "@/lib/db/queries/shops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DELETE } from "./route";

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

function makeContext(shopId: string = MOCK_SHOP_ID, tagId: string = MOCK_TAG_ID) {
	return { params: Promise.resolve({ id: shopId, tagId }) };
}

describe("DELETE /api/shops/[id]/tags/[tagId]", () => {
	beforeEach(() => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase() as never);
		vi.mocked(detachTagFromShop).mockResolvedValue(true);
	});
	afterEach(() => vi.clearAllMocks());

	it("正常な削除で204を返す", async () => {
		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}/tags/${MOCK_TAG_ID}`, {
			method: "DELETE",
		});
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(204);
	});

	it("未認証で401を返す", async () => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase(null) as never);

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}/tags/${MOCK_TAG_ID}`, {
			method: "DELETE",
		});
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(401);
	});

	it("紐付けが存在しない場合は404を返す", async () => {
		vi.mocked(detachTagFromShop).mockResolvedValue(false);

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}/tags/${MOCK_TAG_ID}`, {
			method: "DELETE",
		});
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe("タグの紐付けが見つかりません");
	});

	it("DBエラーで500を返す", async () => {
		vi.mocked(detachTagFromShop).mockRejectedValue(new Error("DB error"));

		const req = new Request(`http://localhost/api/shops/${MOCK_SHOP_ID}/tags/${MOCK_TAG_ID}`, {
			method: "DELETE",
		});
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(500);
	});
});
