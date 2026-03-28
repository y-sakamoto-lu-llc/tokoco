# 認証フロー詳細設計

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-29
**ステータス:** Draft

---

## 目次

1. [設計方針](#1-設計方針)
2. [Supabase Auth 統合パターン](#2-supabase-auth-統合パターン)
3. [会員登録フロー](#3-会員登録フロー)
4. [ログインフロー](#4-ログインフロー)
5. [ログアウトフロー](#5-ログアウトフロー)
6. [パスワードリセットフロー](#6-パスワードリセットフロー)
7. [アカウント設定変更フロー](#7-アカウント設定変更フロー)
8. [アカウント削除フロー](#8-アカウント削除フロー)
9. [Next.js Middleware 認証ガード](#9-nextjs-middleware-認証ガード)
10. [バリデーション仕様](#10-バリデーション仕様)
11. [セキュリティ設計](#11-セキュリティ設計)
12. [Supabase クライアント初期化](#12-supabase-クライアント初期化)

---

## 1. 設計方針

- **Supabase Auth** を認証基盤として全面採用する。パスワードハッシュ・JWT 発行・メール送信はすべて Supabase が担う（SEC-02）。
- **セッション管理** は `@supabase/ssr` パッケージの Cookie ベース管理を使用する。JWT は HttpOnly Cookie に保存し、クライアント JS からは直接参照できない（SEC-03 CSRF 対策）。
- **Edge Runtime** （Cloudflare Pages）で動作させるため、Node.js 専用 API（`crypto`、`fs` 等）は一切使用しない。
- **メール確認必須**（AUTH-02a）：メール確認が完了するまで `/(app)` 配下のルートへのアクセスを middleware でブロックする。
- **パスワード要件**（AUTH-03）：Zod スキーマによるクライアント + サーバー両側バリデーションを実施する。

---

## 2. Supabase Auth 統合パターン

### クライアント種別と用途

| クライアント | パッケージ | 用途 | キー |
|---|---|---|---|
| Server Component / Route Handler（認証済み） | `@supabase/ssr` → `createServerClient` | JWT 検証・ユーザー情報取得・RLS 適用クエリ | `SUPABASE_ANON_KEY` |
| Browser Client Component | `@supabase/ssr` → `createBrowserClient` | リアルタイム購読・クライアントサイドセッション更新 | `SUPABASE_ANON_KEY` |
| Route Handler（ゲスト・管理処理） | `@supabase/supabase-js` → `createClient` | share_token 検証・アカウント削除（service_role） | `SUPABASE_SERVICE_ROLE_KEY` |

### JWT・セッション管理

```
ログイン成功
  │
  ▼
Supabase が以下の Cookie をセット（@supabase/ssr が管理）
  ├── sb-<project>-auth-token   (access_token; JWT; HttpOnly; Secure; SameSite=Lax)
  └── sb-<project>-auth-token.1 (refresh_token; HttpOnly; Secure; SameSite=Lax)

以降のリクエスト
  │ Cookie: sb-*-auth-token
  ▼
middleware.ts / Route Handler
  │ createServerClient が Cookie から JWT を読み取り検証
  │ supabase.auth.getUser() でユーザー情報を取得
  │ user が null → 401 / リダイレクト
  ▼
Supabase RLS が auth.uid() を認識して自動適用
```

- アクセストークンの有効期限はデフォルト 1 時間。`@supabase/ssr` が自動でリフレッシュする。
- マルチデバイス対応（AUTH-07）：Supabase Auth は複数の refresh_token を発行するため、追加実装なしで同時アクセスが可能。

---

## 3. 会員登録フロー

**対応要件:** AUTH-01 / AUTH-02 / AUTH-02a / AUTH-03 / AUTH-04

### フロー概要

```
[S-02 新規登録画面]
  │ 入力: メールアドレス・パスワード・表示名
  │ クライアントバリデーション（Zod）
  ▼
POST /api/auth/signup
  │ サーバーサイドバリデーション（同じ Zod スキーマ）
  │ supabase.auth.signUp({
  │   email,
  │   password,
  │   options: { data: { display_name } }
  │ })
  │ ※ display_name は raw_user_meta_data に格納される
  ▼
Supabase Auth
  │ auth.users に INSERT
  │ on_auth_user_created Trigger 発火
  │   → profiles に INSERT（display_name は raw_user_meta_data から取得）
  │ 確認メールを送信
  ▼
Route Handler レスポンス: 201
  { "message": "確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。" }
  ▼
[S-02] メール確認待ちメッセージを表示

--- メール確認リンクをクリック ---

Supabase が auth.users.email_confirmed_at を設定
  ▼
リダイレクト先（Supabase の emailRedirectTo 設定）: /auth/callback
  ▼
app/auth/callback/route.ts
  │ URL の code パラメータを supabase.auth.exchangeCodeForSession() で交換
  │ セッション Cookie をセット
  ▼
/(app)/home（マイリスト）へリダイレクト
```

### エラーケース

| 条件 | HTTP ステータス | エラーメッセージ |
|---|---|---|
| バリデーションエラー | 400 | 各フィールドのエラーメッセージ |
| メールアドレスが既に登録済み | 409 | 「このメールアドレスはすでに使用されています」 |
| Supabase エラー | 500 | 「登録処理中にエラーが発生しました」 |

### Route Handler 実装仕様

**エンドポイント:** `POST /api/auth/signup`

```typescript
// リクエストボディ
type SignupRequest = {
  email: string
  password: string
  displayName: string
}

// レスポンス（201）
type SignupResponse = {
  message: string
}
```

- `emailRedirectTo` は環境変数 `NEXT_PUBLIC_SITE_URL` + `/auth/callback` を使用する。
- Supabase の「Email already registered」エラー（error code: `user_already_exists`）は 409 として返す。

---

## 4. ログインフロー

**対応要件:** AUTH-05 / AUTH-06 / AUTH-07 / SEC-08

### フロー概要

```
[S-03 ログイン画面]
  │ 入力: メールアドレス・パスワード
  │ クライアントバリデーション（Zod）
  ▼
POST /api/auth/login
  │ サーバーサイドバリデーション
  │ createServerClient で supabase.auth.signInWithPassword({ email, password })
  │ メール未確認の場合 → 403 を返す
  ▼
Supabase Auth
  │ 認証成功 → JWT + refresh_token 発行
  │ Cookie をセット（@supabase/ssr が管理）
  ▼
Route Handler レスポンス: 200
  { "user": { "id": "...", "email": "...", "displayName": "..." } }
  ▼
クライアント: /(app)/home へリダイレクト
```

### エラーケース

| 条件 | HTTP ステータス | エラーメッセージ |
|---|---|---|
| バリデーションエラー | 400 | 「メールアドレスまたはパスワードの形式が正しくありません」 |
| メール未確認 | 403 | 「メールアドレスの確認が完了していません。確認メールをご確認ください」 |
| 認証失敗（メール or パスワード不一致） | 401 | 「メールアドレスまたはパスワードが正しくありません」 |
| レートリミット超過 | 429 | 「ログイン試行回数の上限に達しました。しばらく後にお試しください」 |

**セキュリティ注意点:**
- メール不一致とパスワード不一致は同一エラーメッセージで返す（列挙攻撃対策）。
- レートリミットは Supabase Auth の組み込み機能に委ねる（SEC-08）。

### Route Handler 実装仕様

**エンドポイント:** `POST /api/auth/login`

```typescript
// リクエストボディ
type LoginRequest = {
  email: string
  password: string
}

// レスポンス（200）
type LoginResponse = {
  user: {
    id: string
    email: string
    displayName: string
  }
}
```

---

## 5. ログアウトフロー

**対応要件:** AUTH-08

### フロー概要

```
[ヘッダーメニュー「ログアウト」ボタン]
  ▼
POST /api/auth/logout
  │ createServerClient で supabase.auth.signOut()
  │ Cookie を削除（@supabase/ssr が管理）
  ▼
Route Handler レスポンス: 204
  ▼
クライアント: /(auth)/login へリダイレクト
```

- `signOut()` はデフォルトで現在のデバイスのセッションのみ無効化する（scope: `local`）。
- 全デバイスからのログアウトは v1.0 では提供しない。

### Route Handler 実装仕様

**エンドポイント:** `POST /api/auth/logout`

- 認証必須（JWT）
- レスポンス: 204 No Content

---

## 6. パスワードリセットフロー

**対応要件:** AUTH-09 / AUTH-10

### フロー概要

```
[S-04 パスワードリセット申請画面]
  │ 入力: メールアドレス
  ▼
POST /api/auth/password-reset-request
  │ supabase.auth.resetPasswordForEmail(email, {
  │   redirectTo: NEXT_PUBLIC_SITE_URL + '/auth/password-reset-callback'
  │ })
  │ ※ 存在しないメールアドレスでも成功レスポンスを返す（列挙攻撃対策）
  ▼
Route Handler レスポンス: 200
  { "message": "パスワードリセットメールを送信しました（登録済みの場合）" }
  ▼
[S-04] 「メールを送信しました」メッセージを表示

--- メール内のリンクをクリック（有効期限: 24時間 AUTH-10） ---

Supabase が認証コードを含む URL へリダイレクト
  ▼
app/auth/password-reset-callback/route.ts
  │ code パラメータを exchangeCodeForSession() で交換
  │ ※ この時点でセッションが確立される（パスワード変更専用の一時セッション）
  ▼
[S-05 パスワードリセット実行画面] へリダイレクト
  │ 入力: 新パスワード（確認用を含む）
  ▼
POST /api/auth/password-reset
  │ サーバーサイドバリデーション（パスワード要件チェック）
  │ supabase.auth.updateUser({ password: newPassword })
  │ ※ 一時セッションの JWT で認証済みであることを確認
  ▼
Route Handler レスポンス: 200
  { "message": "パスワードを変更しました" }
  ▼
/(auth)/login へリダイレクト
```

### リセットリンクの有効期限

Supabase の OTP 有効期限設定（`Authentication > Configuration > Email`）で 86400 秒（24 時間）に設定する（AUTH-10）。

### エラーケース

| 条件 | HTTP ステータス | エラーメッセージ |
|---|---|---|
| バリデーションエラー（新パスワード形式不正） | 400 | 「パスワードは8文字以上、英字と数字を含む必要があります」 |
| セッション無効（リンク期限切れ） | 401 | 「リセットリンクが無効または期限切れです。再度申請してください」 |
| Supabase エラー | 500 | 「パスワードの変更中にエラーが発生しました」 |

### Route Handler 実装仕様

**エンドポイント:** `POST /api/auth/password-reset-request`

```typescript
// リクエストボディ
type PasswordResetRequestBody = {
  email: string
}

// レスポンス（200）: 成功・失敗にかかわらず同じメッセージを返す
type PasswordResetRequestResponse = {
  message: string
}
```

**エンドポイント:** `POST /api/auth/password-reset`

```typescript
// リクエストボディ
type PasswordResetBody = {
  password: string
  passwordConfirmation: string  // クライアント側での一致確認用
}

// レスポンス（200）
type PasswordResetResponse = {
  message: string
}
```

---

## 7. アカウント設定変更フロー

**対応要件:** AUTH-11 / AUTH-12 / AUTH-13

### 7.1 表示名変更（AUTH-11）

**エンドポイント:** `PATCH /api/auth/profile`

```
[S-14 アカウント設定画面]
  │ 入力: 新しい表示名
  ▼
PATCH /api/auth/profile
  │ JWT 認証（createServerClient で getUser()）
  │ supabase.auth.updateUser({ data: { display_name: newName } })
  │ profiles テーブルを Drizzle で更新
  │   UPDATE profiles SET display_name = $1, updated_at = now() WHERE id = $2
  ▼
Route Handler レスポンス: 200
  { "displayName": "新しい表示名" }
```

```typescript
// リクエストボディ
type UpdateProfileRequest = {
  displayName: string  // 1文字以上50文字以下
}

// レスポンス（200）
type UpdateProfileResponse = {
  displayName: string
}
```

### 7.2 メールアドレス変更（AUTH-12）

**エンドポイント:** `PATCH /api/auth/email`

```
[S-14 アカウント設定画面]
  │ 入力: 新しいメールアドレス
  ▼
PATCH /api/auth/email
  │ JWT 認証
  │ supabase.auth.updateUser({ email: newEmail })
  │ ※ Supabase が新メールアドレスに確認メールを送信
  │ ※ 確認完了まで旧メールアドレスが有効なまま
  ▼
Route Handler レスポンス: 200
  { "message": "確認メールを送信しました。新しいメールアドレスで確認してください" }
```

```typescript
// リクエストボディ
type UpdateEmailRequest = {
  email: string
}

// レスポンス（200）
type UpdateEmailResponse = {
  message: string
}
```

### エラーケース（メールアドレス変更）

| 条件 | HTTP ステータス | エラーメッセージ |
|---|---|---|
| バリデーションエラー | 400 | 「有効なメールアドレスを入力してください」 |
| 既に使用中のメールアドレス | 409 | 「このメールアドレスはすでに使用されています」 |

### 7.3 パスワード変更（AUTH-13）

**エンドポイント:** `PATCH /api/auth/password`

```
[S-14 アカウント設定画面]
  │ 入力: 現在のパスワード・新しいパスワード
  ▼
PATCH /api/auth/password
  │ JWT 認証
  │ 現在のパスワードを検証:
  │   supabase.auth.signInWithPassword({ email, password: currentPassword })
  │   ※ email は JWT から取得
  │   失敗 → 400「現在のパスワードが正しくありません」
  │ supabase.auth.updateUser({ password: newPassword })
  ▼
Route Handler レスポンス: 200
  { "message": "パスワードを変更しました" }
```

```typescript
// リクエストボディ
type UpdatePasswordRequest = {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string  // クライアント側での一致確認用
}

// レスポンス（200）
type UpdatePasswordResponse = {
  message: string
}
```

### エラーケース（パスワード変更）

| 条件 | HTTP ステータス | エラーメッセージ |
|---|---|---|
| 現在のパスワードが不正 | 400 | 「現在のパスワードが正しくありません」 |
| 新パスワードがバリデーション要件を満たさない | 400 | 「パスワードは8文字以上、英字と数字を含む必要があります」 |
| 新パスワードが現在のパスワードと同じ | 400 | 「新しいパスワードは現在のパスワードと異なる必要があります」 |

---

## 8. アカウント削除フロー

**対応要件:** AUTH-14 / AUTH-15

### フロー概要

```
[S-14 アカウント設定画面]
  │ 「アカウントを削除」ボタン
  ▼
確認ダイアログ表示（AUTH-14）
  │ 「削除する」ボタン
  ▼
DELETE /api/auth/account
  │ JWT 認証（createServerClient で getUser()）
  │
  │ [1] 他ユーザーのイベントへの投票を匿名化（AUTH-15 ②）
  │   ※ on_profile_deleted Trigger が処理するため Route Handler での追加実装は不要
  │   （Trigger: voter_name を「退会済みユーザー」に更新 → FK on delete set null で user_id を NULL に）
  │
  │ [2] service_role クライアントで auth.users を削除
  │   supabaseAdmin.auth.admin.deleteUser(userId)
  │   ※ profiles の on delete cascade により profiles が削除される
  │   ※ profiles の on_profile_deleted Trigger が先に投票を匿名化する
  │   ※ profiles → shops / tags / events が on delete cascade で削除される（AUTH-15 ①）
  │
  │ [3] Cookie を削除
  ▼
Route Handler レスポンス: 204
  ▼
/(auth)/login へリダイレクト
```

### データ削除の挙動まとめ

| データ | 削除方針 | 実装 |
|---|---|---|
| 自分の店舗・タグ | カスケード削除 | `profiles` の `on delete cascade` → `shops`・`tags` |
| 自分のイベント（紐づく投票含む） | カスケード削除 | `events` の `on delete cascade` → `votes`・`vote_choices` |
| 他ユーザーのイベントへの自分の投票 | 匿名化（voter_name 更新・user_id NULL 化） | `on_profile_deleted` Trigger + FK `on delete set null` |

### Route Handler 実装仕様

**エンドポイント:** `DELETE /api/auth/account`

```typescript
// リクエストボディ: なし
// レスポンス: 204 No Content
```

- service_role クライアントは Route Handler 内のみで使用し、クライアントに渡さない。
- `auth.admin.deleteUser()` 実行前に JWT でユーザーを確認し、自分自身のみ削除可能とする。

---

## 9. Next.js Middleware 認証ガード

### middleware.ts 設計

```typescript
// src/middleware.ts

// ガード対象: /(app) 配下のすべてのルート
// 公開ルート: /(auth)/*, /events/share/*, /auth/callback, /auth/password-reset-callback
```

### ルートの分類

| パスパターン | 認証要否 | メール確認要否 | 処理 |
|---|---|---|---|
| `/(auth)/*`（login・signup 等） | 不要 | 不要 | ログイン済みなら `/(app)/home` へリダイレクト |
| `/(app)/*`（home・shops 等） | 必須 | 必須 | 未認証 → `/login`、メール未確認 → `/verify-email` |
| `/events/share/[token]` | 不要 | 不要 | ゲストアクセス可能 |
| `/auth/callback` | 不要 | 不要 | メール確認コールバック |
| `/auth/password-reset-callback` | 不要 | 不要 | パスワードリセットコールバック |
| `/` | 不要 | 不要 | ランディングページ（公開） |

### middleware のフロー

```
リクエスト受信
  │
  ├─ 公開ルート → そのまま通過
  │
  └─ /(app)/* の場合:
       │
       ▼
     createServerClient で supabase.auth.getUser()
       │
       ├─ user が null → /login へリダイレクト
       │
       ├─ user.email_confirmed_at が null
       │   → /verify-email へリダイレクト
       │
       └─ 認証済み・確認済み → そのまま通過
```

### セッション Cookie の自動更新

middleware 内で `supabase.auth.getUser()` を呼ぶことで、`@supabase/ssr` がアクセストークンの期限切れを検知し、refresh_token を使って自動更新する。更新された Cookie は `NextResponse` に付与される。

```typescript
// middleware での基本パターン
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (isProtectedRoute(request.nextUrl.pathname)) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }
  }

  // ログイン済みユーザーが認証ページにアクセスした場合はホームへ
  if (isAuthRoute(request.nextUrl.pathname) && user) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 10. バリデーション仕様

### Zod スキーマ（`src/lib/validations/auth.ts`）

```typescript
import { z } from 'zod'

// パスワード共通バリデーション（AUTH-03）
const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .regex(/[a-zA-Z]/, 'パスワードには英字を含めてください')
  .regex(/[0-9]/, 'パスワードには数字を含めてください')

// 会員登録
export const signupSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: passwordSchema,
  displayName: z
    .string()
    .min(1, '表示名を入力してください')
    .max(50, '表示名は50文字以下で入力してください'),
})

// ログイン
export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})

// パスワードリセット申請
export const passwordResetRequestSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
})

// パスワードリセット実行 / パスワード変更
export const passwordResetSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'パスワードが一致しません',
    path: ['passwordConfirmation'],
  })

// 表示名変更
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, '表示名を入力してください')
    .max(50, '表示名は50文字以下で入力してください'),
})

// メールアドレス変更
export const updateEmailSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
})

// パスワード変更（現在のパスワード必須）
export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
    newPassword: passwordSchema,
    newPasswordConfirmation: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: 'パスワードが一致しません',
    path: ['newPasswordConfirmation'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: '新しいパスワードは現在のパスワードと異なる必要があります',
    path: ['newPassword'],
  })
```

- Route Handler 側では `schema.safeParse(body)` でバリデーションし、失敗時は 400 を返す。
- クライアント側では `useForm({ resolver: zodResolver(schema) })` で同じスキーマを使用する。

---

## 11. セキュリティ設計

### CSRF 対策（SEC-03）

`@supabase/ssr` が発行する Cookie の `SameSite=Lax` 設定により、クロスサイトからのフォーム送信を防ぐ。加えて、すべての状態変更は Route Handler（サーバーサイド）経由で行い、ブラウザから直接 Supabase へアクセスしない設計とする。

### パスワードのハッシュ化（SEC-02）

Supabase Auth が bcrypt でハッシュ化して保存する。アプリケーション層で平文パスワードを永続化しない。

### レートリミット（SEC-08）

Supabase Auth の組み込みレートリミットを活用する。

| エンドポイント | Supabase Auth のデフォルト制限 |
|---|---|
| サインアップ（`/auth/v1/signup`） | 60 リクエスト/時/IP |
| ログイン（`/auth/v1/token`） | 60 リクエスト/時/IP |
| パスワードリセット（`/auth/v1/recover`） | 60 リクエスト/時/IP |

- Supabase Dashboard の `Authentication > Rate Limits` で調整可能。
- Route Handler 自体に追加のレートリミット実装は v1.0 では行わない。

### RLS との連携（SEC-06）

- 会員向け Route Handler は `createServerClient`（anon key + JWT）を使用し、RLS が自動適用される。
- ゲストアクセスおよびアカウント削除のみ service_role を使用する。service_role キーは `SUPABASE_SERVICE_ROLE_KEY` 環境変数で管理し、クライアントバンドルには含めない（`NEXT_PUBLIC_` プレフィックスは付けない）。

### 環境変数の分類

| 変数名 | クライアント公開 | 用途 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 可（公開） | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 可（公開） | anon key（RLS 制御済み） |
| `SUPABASE_SERVICE_ROLE_KEY` | 不可 | service_role（Route Handler のみ） |
| `NEXT_PUBLIC_SITE_URL` | 可（公開） | メールリンクのリダイレクト先ベース URL |

---

## 12. Supabase クライアント初期化

### Server Component / Route Handler 用（`src/lib/supabase/server.ts`）

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Component から呼ばれた場合は Cookie のセットを無視
          }
        },
      },
    }
  )
}
```

### service_role クライアント用（`src/lib/supabase/admin.ts`）

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// このファイルは Route Handler 内からのみ import すること
// クライアントコンポーネントや Server Component で使用してはならない
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

### Browser Client Component 用（`src/lib/supabase/client.ts`）

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- `createSupabaseAdminClient` は必ず `src/app/api/` 配下の Route Handler からのみ呼び出す。
- Server Component での `createSupabaseAdminClient` 使用は禁止（誤ってクライアントバンドルに含まれるリスクを排除するため）。
