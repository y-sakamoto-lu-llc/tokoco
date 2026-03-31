import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
			json: (body: unknown, init?: ResponseInit) => {
				return {
					status: init?.status ?? 200,
					json: async () => body,
				};
			},
		},
	};
});

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
	return new Request("http://localhost/api/auth/password-reset-request", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function makeMockSupabase(resetResult: { error: null | { message: string } }) {
	return {
		auth: {
			resetPasswordForEmail: vi.fn().mockResolvedValue(resetResult),
		},
	};
}

describe("POST /api/auth/password-reset-request", () => {
	beforeEach(() => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.clearAllMocks();
	});

	it("正常なリクエストで200を返す", async () => {
		const mockSupabase = makeMockSupabase({ error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "test@example.com" });
		const res = await POST(req);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toBeDefined();
	});

	it("存在しないメールアドレスでも200を返す（列挙攻撃対策）", async () => {
		const mockSupabase = makeMockSupabase({ error: { message: "User not found" } });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "notexist@example.com" });
		const res = await POST(req);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toBeDefined();
	});

	it("redirectTo に NEXT_PUBLIC_SITE_URL + /auth/password-reset-callback が設定される", async () => {
		const mockSupabase = makeMockSupabase({ error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "test@example.com" });
		await POST(req);

		expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
			"test@example.com",
			expect.objectContaining({
				redirectTo: "https://example.com/auth/password-reset-callback",
			})
		);
	});

	it("バリデーションエラー（メールアドレス不正）で400を返す", async () => {
		const mockSupabase = makeMockSupabase({ error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "not-an-email" });
		const res = await POST(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.errors?.email).toBeDefined();
		expect(mockSupabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
	});

	it("バリデーションエラー（メールアドレスなし）で400を返す", async () => {
		const mockSupabase = makeMockSupabase({ error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({});
		const res = await POST(req);

		expect(res.status).toBe(400);
		expect(mockSupabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
	});

	it("不正な JSON で400を返す", async () => {
		const req = new Request("http://localhost/api/auth/password-reset-request", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "invalid-json",
		});

		const res = await POST(req);

		expect(res.status).toBe(400);
	});
});
