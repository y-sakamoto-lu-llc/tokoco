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
	return new Request("http://localhost/api/auth/signup", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function makeMockSupabase(signUpResult: { error: null | { code?: string; message: string } }) {
	return {
		auth: {
			signUp: vi.fn().mockResolvedValue(signUpResult),
		},
	};
}

describe("POST /api/auth/signup", () => {
	beforeEach(() => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.clearAllMocks();
	});

	it("正常なリクエストで201を返す", async () => {
		const mockSupabase = makeMockSupabase({ error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			email: "test@example.com",
			password: "Password1",
			displayName: "テストユーザー",
		});

		const res = await POST(req);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.message).toContain("確認メールを送信しました");
	});

	it("emailRedirectTo に NEXT_PUBLIC_SITE_URL + /auth/callback が設定される", async () => {
		const mockSupabase = makeMockSupabase({ error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			email: "test@example.com",
			password: "Password1",
			displayName: "テストユーザー",
		});

		await POST(req);

		expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.objectContaining({
					emailRedirectTo: "https://example.com/auth/callback",
				}),
			})
		);
	});

	it("display_name が raw_user_meta_data に渡される", async () => {
		const mockSupabase = makeMockSupabase({ error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			email: "test@example.com",
			password: "Password1",
			displayName: "表示名テスト",
		});

		await POST(req);

		expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.objectContaining({
					data: { display_name: "表示名テスト" },
				}),
			})
		);
	});

	it("バリデーションエラー（パスワード不正）で400を返す", async () => {
		const mockSupabase = makeMockSupabase({ error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			email: "test@example.com",
			password: "short",
			displayName: "テストユーザー",
		});

		const res = await POST(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBeDefined();
		expect(body.errors).toBeDefined();
		// Supabase は呼ばれない
		expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
	});

	it("バリデーションエラー（メールアドレス不正）で400を返す", async () => {
		const mockSupabase = makeMockSupabase({ error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			email: "not-an-email",
			password: "Password1",
			displayName: "テスト",
		});

		const res = await POST(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.errors?.email).toBeDefined();
	});

	it("バリデーションエラー（表示名なし）で400を返す", async () => {
		const mockSupabase = makeMockSupabase({ error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			email: "test@example.com",
			password: "Password1",
			displayName: "",
		});

		const res = await POST(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.errors?.displayName).toBeDefined();
	});

	it("メール重複エラー（user_already_exists）で409を返す", async () => {
		const mockSupabase = makeMockSupabase({
			error: { code: "user_already_exists", message: "User already registered" },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			email: "existing@example.com",
			password: "Password1",
			displayName: "テストユーザー",
		});

		const res = await POST(req);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.error).toBe("このメールアドレスはすでに使用されています");
	});

	it("Supabase 内部エラーで500を返す", async () => {
		const mockSupabase = makeMockSupabase({
			error: { message: "Internal server error" },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			email: "test@example.com",
			password: "Password1",
			displayName: "テストユーザー",
		});

		const res = await POST(req);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBe("登録処理中にエラーが発生しました");
	});

	it("不正なJSON で400を返す", async () => {
		const req = new Request("http://localhost/api/auth/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "invalid-json",
		});

		const res = await POST(req);

		expect(res.status).toBe(400);
	});
});
