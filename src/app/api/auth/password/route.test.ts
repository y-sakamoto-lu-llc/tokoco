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
	return new Request("http://localhost/api/auth/password", {
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

const validBody = {
	currentPassword: "CurrentPass1",
	newPassword: "NewPassword1",
	newPasswordConfirmation: "NewPassword1",
};

function makeMockSupabase(
	user: typeof validUser | null,
	signInResult: { error: { message: string } | null },
	updateResult: { error: { message: string } | null }
) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user },
				error: user ? null : { message: "Not authenticated" },
			}),
			signInWithPassword: vi.fn().mockResolvedValue(signInResult),
			updateUser: vi.fn().mockResolvedValue(updateResult),
		},
	};
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("PATCH /api/auth/password", () => {
	it("正常なリクエストで200とメッセージを返す", async () => {
		const mockSupabase = makeMockSupabase(validUser, { error: null }, { error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest(validBody);
		const res = await PATCH(req);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toBe("パスワードを変更しました");
	});

	it("未認証の場合は401を返す", async () => {
		const mockSupabase = makeMockSupabase(null, { error: null }, { error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest(validBody);
		const res = await PATCH(req);

		expect(res.status).toBe(401);
	});

	it("現在のパスワードが誤りの場合は400を返す", async () => {
		const mockSupabase = makeMockSupabase(
			validUser,
			{ error: { message: "Invalid login credentials" } },
			{ error: null }
		);
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest(validBody);
		const res = await PATCH(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe("現在のパスワードが正しくありません");
	});

	it("新パスワードが現在のパスワードと同じ場合はバリデーションで400を返す", async () => {
		const mockSupabase = makeMockSupabase(validUser, { error: null }, { error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			currentPassword: "SamePass1",
			newPassword: "SamePass1",
			newPasswordConfirmation: "SamePass1",
		});
		const res = await PATCH(req);

		expect(res.status).toBe(400);
	});

	it("新パスワードと確認用パスワードが一致しない場合は400を返す", async () => {
		const mockSupabase = makeMockSupabase(validUser, { error: null }, { error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			currentPassword: "CurrentPass1",
			newPassword: "NewPassword1",
			newPasswordConfirmation: "DifferentPass1",
		});
		const res = await PATCH(req);

		expect(res.status).toBe(400);
	});

	it("新パスワードが要件を満たさない場合は400を返す（短すぎる）", async () => {
		const mockSupabase = makeMockSupabase(validUser, { error: null }, { error: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest({
			currentPassword: "CurrentPass1",
			newPassword: "short",
			newPasswordConfirmation: "short",
		});
		const res = await PATCH(req);

		expect(res.status).toBe(400);
	});

	it("不正なJSONで400を返す", async () => {
		const req = new Request("http://localhost/api/auth/password", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: "invalid-json",
		});

		const res = await PATCH(req);

		expect(res.status).toBe(400);
	});
});
