import { afterEach, describe, expect, it, vi } from "vitest";

// createSupabaseServerClient のモック
vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServerClient: vi.fn(),
}));

// createSupabaseAdminClient のモック
vi.mock("@/lib/supabase/admin", () => ({
	createSupabaseAdminClient: vi.fn(),
}));

// next/server の NextResponse をモック
vi.mock("next/server", async (importOriginal) => {
	const actual = await importOriginal<typeof import("next/server")>();

	// NextResponse コンストラクタをモックするためにクラスとして定義
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

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DELETE } from "./route";

function makeRequest(): Request {
	return new Request("http://localhost/api/auth/account", {
		method: "DELETE",
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
			signOut: vi.fn().mockResolvedValue({ error: null }),
		},
	};
}

function makeMockAdminClient(deleteResult: { error: { message: string } | null }) {
	return {
		auth: {
			admin: {
				deleteUser: vi.fn().mockResolvedValue(deleteResult),
			},
		},
	};
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("DELETE /api/auth/account", () => {
	it("正常なリクエストで204を返す", async () => {
		const mockSupabase = makeMockSupabase(validUser);
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const mockAdmin = makeMockAdminClient({ error: null });
		vi.mocked(createSupabaseAdminClient).mockReturnValue(
			mockAdmin as ReturnType<typeof makeMockAdminClient> as never
		);

		const req = makeRequest();
		const res = await DELETE(req);

		expect(res.status).toBe(204);
		expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("user-123");
		expect(mockSupabase.auth.signOut).toHaveBeenCalled();
	});

	it("未認証の場合は401を返す", async () => {
		const mockSupabase = makeMockSupabase(null);
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const req = makeRequest();
		const res = await DELETE(req);

		expect(res.status).toBe(401);
	});

	it("Supabase admin のエラー時は500を返す", async () => {
		const mockSupabase = makeMockSupabase(validUser);
		vi.mocked(createSupabaseServerClient).mockResolvedValue(
			mockSupabase as ReturnType<typeof makeMockSupabase> as never
		);

		const mockAdmin = makeMockAdminClient({ error: { message: "User not found" } });
		vi.mocked(createSupabaseAdminClient).mockReturnValue(
			mockAdmin as ReturnType<typeof makeMockAdminClient> as never
		);

		const req = makeRequest();
		const res = await DELETE(req);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toContain("エラーが発生しました");
	});
});
