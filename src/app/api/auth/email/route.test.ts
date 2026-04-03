import { afterEach, describe, expect, it, vi } from "vitest";

// createSupabaseServerClient のモック
vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: vi.fn(),
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

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PATCH } from "./route";

function makeRequest(body: unknown): Request {
	return new Request("http://localhost/api/auth/email", {
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

function makeMockSupabase(
	user: typeof validUser | null,
	updateUserResult: { error: { code?: string; message?: string } | null }
) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user },
				error: user ? null : { message: "Not authenticated" },
			}),
			updateUser: vi.fn().mockResolvedValue(updateUserResult),
		},
	};
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("PATCH /api/auth/email", () => {
	it("正常なリクエストで200とメッセージを返す", async () => {
		const mockSupabase = makeMockSupabase(validUser, { error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "new@example.com" });
		const res = await PATCH(req);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toContain("確認メールを送信しました");
	});

	it("未認証の場合は401を返す", async () => {
		const mockSupabase = makeMockSupabase(null, { error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "new@example.com" });
		const res = await PATCH(req);

		expect(res.status).toBe(401);
	});

	it("不正なメール形式で400を返す", async () => {
		const mockSupabase = makeMockSupabase(validUser, { error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "not-an-email" });
		const res = await PATCH(req);

		expect(res.status).toBe(400);
	});

	it("既に使用中のメールアドレスの場合は409を返す", async () => {
		const mockSupabase = makeMockSupabase(validUser, {
			error: { code: "email_exists", message: "Email already registered" },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "existing@example.com" });
		const res = await PATCH(req);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.error).toContain("すでに使用されています");
	});

	it("不正なJSONで400を返す", async () => {
		const req = new Request("http://localhost/api/auth/email", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: "invalid-json",
		});

		const res = await PATCH(req);

		expect(res.status).toBe(400);
	});
});
