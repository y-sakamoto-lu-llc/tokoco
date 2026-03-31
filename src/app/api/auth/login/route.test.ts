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
	return new Request("http://localhost/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

type SignInResult = {
	data: {
		user: {
			id: string;
			email: string;
			email_confirmed_at: string | null;
			user_metadata: { display_name?: string };
		} | null;
		session: null;
	};
	error: { status?: number; code?: string; message: string } | null;
};

function makeMockSupabase(signInResult: SignInResult) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
			signInWithPassword: vi.fn().mockResolvedValue(signInResult),
		},
	};
}

const validUser = {
	id: "user-123",
	email: "test@example.com",
	email_confirmed_at: "2026-01-01T00:00:00Z",
	user_metadata: { display_name: "テストユーザー" },
};

describe("POST /api/auth/login", () => {
	beforeEach(() => {});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("正常なリクエストで200とユーザー情報を返す", async () => {
		const mockSupabase = makeMockSupabase({
			data: { user: validUser, session: null },
			error: null,
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "test@example.com", password: "Password1" });
		const res = await POST(req);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.user.id).toBe("user-123");
		expect(body.user.email).toBe("test@example.com");
		expect(body.user.displayName).toBe("テストユーザー");
	});

	it("display_name が未設定の場合はメールアドレスをフォールバックとして使う", async () => {
		const mockSupabase = makeMockSupabase({
			data: {
				user: { ...validUser, user_metadata: {} },
				session: null,
			},
			error: null,
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "test@example.com", password: "Password1" });
		const res = await POST(req);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.user.displayName).toBe("test@example.com");
	});

	it("バリデーションエラー（メールなし）で400を返す", async () => {
		const mockSupabase = makeMockSupabase({
			data: { user: validUser, session: null },
			error: null,
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "", password: "Password1" });
		const res = await POST(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBeDefined();
		// Supabase は呼ばれない
		expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
	});

	it("バリデーションエラー（不正なメール形式）で400を返す", async () => {
		const mockSupabase = makeMockSupabase({
			data: { user: validUser, session: null },
			error: null,
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "not-an-email", password: "Password1" });
		const res = await POST(req);

		expect(res.status).toBe(400);
	});

	it("バリデーションエラー（パスワードなし）で400を返す", async () => {
		const mockSupabase = makeMockSupabase({
			data: { user: validUser, session: null },
			error: null,
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "test@example.com", password: "" });
		const res = await POST(req);

		expect(res.status).toBe(400);
	});

	it("認証失敗で401を返す", async () => {
		const mockSupabase = makeMockSupabase({
			data: { user: null, session: null },
			error: { status: 400, message: "Invalid login credentials" },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "test@example.com", password: "WrongPassword1" });
		const res = await POST(req);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe("メールアドレスまたはパスワードが正しくありません");
	});

	it("メール未確認の場合は401を返す", async () => {
		const mockSupabase = makeMockSupabase({
			data: { user: null, session: null },
			error: { code: "email_not_confirmed", message: "Email not confirmed" },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "test@example.com", password: "Password1" });
		const res = await POST(req);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toContain("確認が完了していません");
	});

	it("レートリミット超過で429を返す", async () => {
		const mockSupabase = makeMockSupabase({
			data: { user: null, session: null },
			error: { status: 429, message: "Too many requests" },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({ email: "test@example.com", password: "Password1" });
		const res = await POST(req);

		expect(res.status).toBe(429);
		const body = await res.json();
		expect(body.error).toContain("上限に達しました");
	});

	it("不正なJSONで400を返す", async () => {
		const req = new Request("http://localhost/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "invalid-json",
		});

		const res = await POST(req);

		expect(res.status).toBe(400);
	});
});
