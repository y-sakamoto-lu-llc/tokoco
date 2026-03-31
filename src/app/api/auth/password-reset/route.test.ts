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
	return new Request("http://localhost/api/auth/password-reset", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function makeMockSupabase({
	user,
	updateUserResult,
}: {
	user: { id: string } | null;
	updateUserResult: { error: null | { message: string } };
}) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user } }),
			updateUser: vi.fn().mockResolvedValue(updateUserResult),
		},
	};
}

describe("POST /api/auth/password-reset", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("セッションあり・正常なリクエストで200を返す", async () => {
		const mockSupabase = makeMockSupabase({
			user: { id: "user-123" },
			updateUserResult: { error: null },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			password: "NewPassword1",
			passwordConfirmation: "NewPassword1",
		});
		const res = await POST(req);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toBe("パスワードを変更しました");
	});

	it("updateUser に新しいパスワードが渡される", async () => {
		const mockSupabase = makeMockSupabase({
			user: { id: "user-123" },
			updateUserResult: { error: null },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			password: "NewPassword1",
			passwordConfirmation: "NewPassword1",
		});
		await POST(req);

		expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: "NewPassword1" });
	});

	it("セッションなし（リンク期限切れ）で401を返す", async () => {
		const mockSupabase = makeMockSupabase({
			user: null,
			updateUserResult: { error: null },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			password: "NewPassword1",
			passwordConfirmation: "NewPassword1",
		});
		const res = await POST(req);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toContain("リセットリンクが無効");
		expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
	});

	it("バリデーションエラー（パスワード不正）で400を返す", async () => {
		const mockSupabase = makeMockSupabase({
			user: { id: "user-123" },
			updateUserResult: { error: null },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			password: "short",
			passwordConfirmation: "short",
		});
		const res = await POST(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.errors).toBeDefined();
		expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
	});

	it("バリデーションエラー（パスワード不一致）で400を返す", async () => {
		const mockSupabase = makeMockSupabase({
			user: { id: "user-123" },
			updateUserResult: { error: null },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			password: "Password1",
			passwordConfirmation: "Password2",
		});
		const res = await POST(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.errors?.passwordConfirmation).toBeDefined();
	});

	it("Supabase updateUser エラーで500を返す", async () => {
		const mockSupabase = makeMockSupabase({
			user: { id: "user-123" },
			updateUserResult: { error: { message: "Internal server error" } },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			password: "NewPassword1",
			passwordConfirmation: "NewPassword1",
		});
		const res = await POST(req);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBe("パスワードの変更中にエラーが発生しました");
	});

	it("不正な JSON で400を返す", async () => {
		const req = new Request("http://localhost/api/auth/password-reset", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "invalid-json",
		});

		const res = await POST(req);

		expect(res.status).toBe(400);
	});
});
