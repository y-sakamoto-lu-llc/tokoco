import { describe, expect, it } from "vitest";

// isPublicRoute / isProtectedRoute / isAuthRoute のロジックをテスト
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/reset-password", "/verify-email"];
const PUBLIC_ROUTE_PREFIXES = ["/events/share/", "/auth/callback", "/auth/password-reset-callback"];
const AUTH_ROUTES = ["/login", "/signup", "/reset-password"];

function isPublicRoute(pathname: string): boolean {
	if (PUBLIC_ROUTES.includes(pathname)) {
		return true;
	}
	return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedRoute(pathname: string): boolean {
	return !isPublicRoute(pathname);
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

	describe("isProtectedRoute", () => {
		it("/home は保護されたルート（認証必須）", () => {
			expect(isProtectedRoute("/home")).toBe(true);
		});

		it("/shops は保護されたルート（認証必須）", () => {
			expect(isProtectedRoute("/shops")).toBe(true);
		});

		it("/events は保護されたルート（認証必須）", () => {
			expect(isProtectedRoute("/events")).toBe(true);
		});

		it("/account は保護されたルート（認証必須）", () => {
			expect(isProtectedRoute("/account")).toBe(true);
		});

		it("/ は保護されたルートではない（公開）", () => {
			expect(isProtectedRoute("/")).toBe(false);
		});

		it("/login は保護されたルートではない（公開）", () => {
			expect(isProtectedRoute("/login")).toBe(false);
		});

		it("/events/share/<token> は保護されたルートではない（ゲストアクセス可）", () => {
			expect(isProtectedRoute("/events/share/abc123")).toBe(false);
		});

		it("/verify-email は保護されたルートではない（リダイレクトループ防止）", () => {
			expect(isProtectedRoute("/verify-email")).toBe(false);
		});
	});
});
