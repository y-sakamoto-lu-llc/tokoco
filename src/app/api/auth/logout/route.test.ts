import { afterEach, describe, expect, it, vi } from "vitest";

// createSupabaseServerClient のモック
vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: vi.fn(),
}));

// next/server の NextResponse をモック
vi.mock("next/server", async (importOriginal) => {
	const actual = await importOriginal<typeof import("next/server")>();

	// コンストラクタとして使える関数
	function MockNextResponse(body: BodyInit | null, init?: ResponseInit) {
		return {
			status: init?.status ?? 200,
			json: async () => body,
		};
	}
	MockNextResponse.json = (body: unknown, init?: ResponseInit) => {
		return {
			status: init?.status ?? 200,
			json: async () => body,
		};
	};
	// static メソッドをコピー
	Object.assign(MockNextResponse, actual.NextResponse);

	return {
		...actual,
		NextResponse: MockNextResponse,
	};
});

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POST } from "./route";

const validUser = {
	id: "user-123",
	email: "test@example.com",
};

function makeMockSupabase(options: {
	user: typeof validUser | null;
	signOutError: { message: string } | null;
}) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user: options.user },
				error: null,
			}),
			signOut: vi.fn().mockResolvedValue({ error: options.signOutError }),
		},
	};
}

describe("POST /api/auth/logout", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("認証済みユーザーが正常にログアウトして204を返す", async () => {
		const mockSupabase = makeMockSupabase({ user: validUser, signOutError: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const res = await POST();

		expect(res.status).toBe(204);
		expect(mockSupabase.auth.signOut).toHaveBeenCalledOnce();
	});

	it("未認証の場合は401を返す", async () => {
		const mockSupabase = makeMockSupabase({ user: null, signOutError: null });
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const res = await POST();

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBeDefined();
		// signOut は呼ばれない
		expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
	});

	it("signOut でエラーが発生した場合は500を返す", async () => {
		const mockSupabase = makeMockSupabase({
			user: validUser,
			signOutError: { message: "Internal server error" },
		});
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const res = await POST();

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBeDefined();
	});
});
