import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/db/queries/tags", () => ({
	deleteTag: vi.fn(),
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

import { deleteTag } from "@/lib/db/queries/tags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DELETE } from "./route";

const MOCK_USER = { id: "user-uuid-1" };
const MOCK_TAG_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

function makeMockSupabase(user: { id: string } | null = MOCK_USER) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user } }),
		},
	};
}

function makeContext(id: string = MOCK_TAG_ID) {
	return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/tags/[id]", () => {
	beforeEach(() => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase() as never);
		vi.mocked(deleteTag).mockResolvedValue(true);
	});
	afterEach(() => vi.clearAllMocks());

	it("正常な削除で204を返す", async () => {
		const req = new Request(`http://localhost/api/tags/${MOCK_TAG_ID}`, { method: "DELETE" });
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(204);
	});

	it("未認証で401を返す", async () => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase(null) as never);

		const req = new Request(`http://localhost/api/tags/${MOCK_TAG_ID}`, { method: "DELETE" });
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(401);
	});

	it("存在しないタグで404を返す", async () => {
		vi.mocked(deleteTag).mockResolvedValue(false);

		const req = new Request(`http://localhost/api/tags/${MOCK_TAG_ID}`, { method: "DELETE" });
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe("タグが見つかりません");
	});

	it("DBエラーで500を返す", async () => {
		vi.mocked(deleteTag).mockRejectedValue(new Error("DB error"));

		const req = new Request(`http://localhost/api/tags/${MOCK_TAG_ID}`, { method: "DELETE" });
		const res = await DELETE(req, makeContext());

		expect(res.status).toBe(500);
	});
});
