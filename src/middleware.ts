import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// 認証不要のルートパターン
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/reset-password", "/verify-email"];
const PUBLIC_ROUTE_PREFIXES = ["/events/share/", "/auth/callback", "/auth/password-reset-callback"];

// 認証済みユーザーをリダイレクトする認証系ルート
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

export async function middleware(request: NextRequest) {
	let response = NextResponse.next({ request });

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

	const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					request.cookies.set(name, value);
					response = NextResponse.next({ request });
					response.cookies.set(name, value, options);
				}
			},
		},
	});

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { pathname } = request.nextUrl;

	// 公開ルートはそのまま通過
	if (isPublicRoute(pathname)) {
		// ログイン済みユーザーが認証ページにアクセスした場合はホームへ
		if (isAuthRoute(pathname) && user) {
			return NextResponse.redirect(new URL("/home", request.url));
		}
		return response;
	}

	// 保護されたルートへのアクセスは認証を確認
	if (!user) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	if (!user.email_confirmed_at) {
		return NextResponse.redirect(new URL("/verify-email", request.url));
	}

	return response;
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
