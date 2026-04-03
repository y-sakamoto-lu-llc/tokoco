import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/db/queries/tags", () => ({
	getTagsByUserId: vi.fn(),
	createTag: vi.fn(),
}));

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

import { createTag, getTagsByUserId } from "@/lib/db/queries/tags";
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

const MOCK_TAGS = [
	{ id: "tag-1", name: "和食", createdAt: "2026-01-01T00:00:00.000Z" },
	{ id: "tag-2", name: "ランチ", createdAt: "2026-01-02T00:00:00.000Z" },
];

describe("GET /api/tags", () => {
	beforeEach(() => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase() as never);
		vi.mocked(getTagsByUserId).mockResolvedValue(MOCK_TAGS);
	});
	afterEach(() => vi.clearAllMocks());

	it("認証済みユーザーで200とタグ一覧を返す", async () => {
		const req = new Request("http://localhost/api/tags");
		const res = await GET();

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(2);
	});

	it("未認証で401を返す", async () => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase(null) as never);

		const res = await GET();

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe("ログインが必要です");
	});

	it("DBエラーで500を返す", async () => {
		vi.mocked(getTagsByUserId).mockRejectedValue(new Error("DB error"));

		const res = await GET();

		expect(res.status).toBe(500);
	});
});

describe("POST /api/tags", () => {
	const MOCK_TAG = { id: "tag-new", name: "新タグ", createdAt: "2026-01-01T00:00:00.000Z" };

	beforeEach(() => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase() as never);
		vi.mocked(createTag).mockResolvedValue(MOCK_TAG);
	});
	afterEach(() => vi.clearAllMocks());

	function makeRequest(body: unknown) {
		return new Request("http://localhost/api/tags", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	}

	it("正常なリクエストで201とタグを返す", async () => {
		const req = makeRequest({ name: "新タグ" });
		const res = await POST(req);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.id).toBe("tag-new");
		expect(body.name).toBe("新タグ");
	});

	it("未認証で401を返す", async () => {
		vi.mocked(createSupabaseServerClient).mockResolvedValue(makeMockSupabase(null) as never);

		const req = makeRequest({ name: "新タグ" });
		const res = await POST(req);

		expect(res.status).toBe(401);
	});

	it("タグ名なしで400を返す", async () => {
		const req = makeRequest({ name: "" });
		const res = await POST(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.errors?.name).toBeDefined();
	});

	it("51文字以上のタグ名で400を返す", async () => {
		const req = makeRequest({ name: "あ".repeat(51) });
		const res = await POST(req);

		expect(res.status).toBe(400);
	});

	it("50文字のタグ名は正常に受け付ける", async () => {
		const req = makeRequest({ name: "あ".repeat(50) });
		const res = await POST(req);

		expect(res.status).toBe(201);
	});

	it("同名タグが存在する場合は409を返す", async () => {
		vi.mocked(createTag).mockResolvedValue("conflict");

		const req = makeRequest({ name: "既存タグ" });
		const res = await POST(req);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.error).toBe("同名のタグがすでに存在します");
	});

	it("不正なJSONで400を返す", async () => {
		const req = new Request("http://localhost/api/tags", {
			method: "POST",
			body: "invalid-json",
		});
		const res = await POST(req);

		expect(res.status).toBe(400);
	});

	it("DBエラーで500を返す", async () => {
		vi.mocked(createTag).mockRejectedValue(new Error("DB error"));

		const req = makeRequest({ name: "新タグ" });
		const res = await POST(req);

		expect(res.status).toBe(500);
	});
});
