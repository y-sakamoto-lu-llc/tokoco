import { afterEach, describe, expect, it, vi } from "vitest";

// createSupabaseServerClient のモック
vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: vi.fn(),
}));

// createDb のモック
vi.mock("@/db", () => ({
	createDb: vi.fn(),
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

import { createDb } from "@/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PATCH } from "./route";

function makeRequest(body: unknown): Request {
	return new Request("http://localhost/api/auth/profile", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

const validUser = {
	id: "user-123",
	email: "test@example.com",
	user_metadata: { display_name: "テストユーザー" },
};

function makeMockSupabase(user: typeof validUser | null) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user },
				error: user ? null : { message: "Not authenticated" },
			}),
		},
	};
}

function makeMockDb() {
	const updateMock = vi.fn().mockReturnThis();
	const setMock = vi.fn().mockReturnThis();
	const whereMock = vi.fn().mockResolvedValue([]);
	return {
		update: updateMock,
		set: setMock,
		where: whereMock,
		_chain: { update: updateMock, set: setMock, where: whereMock },
	};
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("PATCH /api/auth/profile", () => {
	it("正常なリクエストで200と更新後の表示名を返す", async () => {
		const mockSupabase = makeMockSupabase(validUser);
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const db = {
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			}),
		};
		vi.mocked(createDb).mockReturnValue(db as never);

		const req = makeRequest({ displayName: "新しい表示名" });
		const res = await PATCH(req);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.displayName).toBe("新しい表示名");
	});

	it("未認証の場合は401を返す", async () => {
		const mockSupabase = makeMockSupabase(null);
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ displayName: "新しい表示名" });
		const res = await PATCH(req);

		expect(res.status).toBe(401);
	});

	it("表示名が空の場合は400を返す", async () => {
		const mockSupabase = makeMockSupabase(validUser);
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ displayName: "" });
		const res = await PATCH(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBeDefined();
	});

	it("表示名が51文字以上の場合は400を返す", async () => {
		const mockSupabase = makeMockSupabase(validUser);
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ displayName: "a".repeat(51) });
		const res = await PATCH(req);

		expect(res.status).toBe(400);
	});

	it("不正なJSONで400を返す", async () => {
		const req = new Request("http://localhost/api/auth/profile", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: "invalid-json",
		});

		const res = await PATCH(req);

		expect(res.status).toBe(400);
	});
});
