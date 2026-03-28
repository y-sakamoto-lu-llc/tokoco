import { describe, expect, it } from "vitest";

// isPublicRoute / isAuthRoute のロジックをテスト（関数をエクスポートせずにロジックだけ検証）
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/reset-password", "/verify-email"];
const PUBLIC_ROUTE_PREFIXES = ["/events/share/", "/auth/callback", "/auth/password-reset-callback"];
const AUTH_ROUTES = ["/login", "/signup", "/reset-password"];

function isPublicRoute(pathname: string): boolean {
	if (PUBLIC_ROUTES.includes(pathname)) {
		return true;
	}
	return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthRoute(pathname: string): boolean {
	return AUTH_ROUTES.includes(pathname);
}

describe("middleware route classification", () => {
	describe("isPublicRoute", () => {
		it("/ はパブリックルート", () => {
			expect(isPublicRoute("/")).toBe(true);
		});

		it("/login はパブリックルート", () => {
			expect(isPublicRoute("/login")).toBe(true);
		});

		it("/signup はパブリックルート", () => {
			expect(isPublicRoute("/signup")).toBe(true);
		});

		it("/reset-password はパブリックルート", () => {
			expect(isPublicRoute("/reset-password")).toBe(true);
		});

		it("/events/share/<token> はパブリックルート（ゲストアクセス可）", () => {
			expect(isPublicRoute("/events/share/abc123")).toBe(true);
		});

		it("/auth/callback はパブリックルート", () => {
			expect(isPublicRoute("/auth/callback")).toBe(true);
		});

		it("/auth/password-reset-callback はパブリックルート", () => {
			expect(isPublicRoute("/auth/password-reset-callback")).toBe(true);
		});

		it("/verify-email はパブリックルート（リダイレクトループ防止）", () => {
			expect(isPublicRoute("/verify-email")).toBe(true);
		});

		it("/home はパブリックルートではない（認証必須）", () => {
			expect(isPublicRoute("/home")).toBe(false);
		});

		it("/shops はパブリックルートではない（認証必須）", () => {
			expect(isPublicRoute("/shops")).toBe(false);
		});

		it("/events はパブリックルートではない（認証必須）", () => {
			expect(isPublicRoute("/events")).toBe(false);
		});

		it("/account はパブリックルートではない（認証必須）", () => {
			expect(isPublicRoute("/account")).toBe(false);
		});
	});

	describe("isAuthRoute", () => {
		it("/login は認証ルート", () => {
			expect(isAuthRoute("/login")).toBe(true);
		});

		it("/signup は認証ルート", () => {
			expect(isAuthRoute("/signup")).toBe(true);
		});

		it("/reset-password は認証ルート", () => {
			expect(isAuthRoute("/reset-password")).toBe(true);
		});

		it("/ は認証ルートではない", () => {
			expect(isAuthRoute("/")).toBe(false);
		});

		it("/home は認証ルートではない", () => {
			expect(isAuthRoute("/home")).toBe(false);
		});
	});
});
