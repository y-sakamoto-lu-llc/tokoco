import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// 認証不要のルート（完全一致）
// /verify-email はリダイレクトループ防止のために公開ルートに含める
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/reset-password", "/verify-email"];

// 認証不要のルート（前方一致）
// /events/share/* はゲストアクセス可能（share_token 経由の投票用）
// /auth/callback・/auth/password-reset-callback は Supabase Auth のコールバック処理
const PUBLIC_ROUTE_PREFIXES = ["/events/share/", "/auth/callback", "/auth/password-reset-callback"];

// 認証済みユーザーが /(auth) ルートにアクセスした場合に /home へリダイレクトする対象
const AUTH_ROUTES = ["/login", "/signup", "/reset-password"];

function isPublicRoute(pathname: string): boolean {
	if (PUBLIC_ROUTES.includes(pathname)) {
		return true;
	}
	return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** 公開ルート以外はすべて認証が必要（/(app)/* に相当） */
function isProtectedRoute(pathname: string): boolean {
	return !isPublicRoute(pathname);
}

function isAuthRoute(pathname: string): boolean {
	return AUTH_ROUTES.includes(pathname);
}

export async function middleware(request: NextRequest) {
	let response = NextResponse.next({ request });

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

	// supabase.auth.getUser() の呼び出しにより @supabase/ssr がアクセストークンの
	// 期限切れを検知し、refresh_token を使って自動更新する（セッション自動更新）
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

	// 保護されたルートへのアクセスは認証を確認
	if (isProtectedRoute(pathname)) {
		if (!user) {
			return NextResponse.redirect(new URL("/login", request.url));
		}
		if (!user.email_confirmed_at) {
			return NextResponse.redirect(new URL("/verify-email", request.url));
		}
	}

	// ログイン済みユーザーが認証ページ（/(auth)/*）にアクセスした場合はホームへ
	if (isAuthRoute(pathname) && user) {
		return NextResponse.redirect(new URL("/home", request.url));
	}

	return response;
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
