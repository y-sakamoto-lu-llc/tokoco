# API Route Handler 設計

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-29
**ステータス:** Draft

---

## 目次

1. [設計方針](#1-設計方針)
2. [エンドポイント一覧](#2-エンドポイント一覧)
3. [共通仕様](#3-共通仕様)
4. [認証方式](#4-認証方式)
5. [Route Handler 詳細](#5-route-handler-詳細)
   - 5.1 認証・アカウント管理
   - 5.2 店舗
   - 5.3 タグ
   - 5.4 イベント
   - 5.5 投票
6. [share_token 検証方式](#6-share_token-検証方式)
7. [レートリミット設計](#7-レートリミット設計)
8. [CORS ポリシー](#8-cors-ポリシー)
9. [Realtime 設計](#9-realtime-設計)

---

## 1. 設計方針

- **認証が必要なエンドポイント**は Supabase Auth の JWT（Cookie セッション）を検証する。
- **share_token 経由のゲストアクセス**は Route Handler 内で service_role クライアントを使用して検証する。service_role キーはサーバー側（環境変数）にのみ保持し、クライアントには絶対に渡さない。
- **Google Places API キー**もサーバー側にのみ保持し、ブラウザから直接 Google API を叩かない（SHOP-02 / 7.1 セキュリティ要件）。
- **バリデーション**は Zod スキーマを `src/lib/validations/` に定義し、Route Handler とクライアントフォームで共有する（SEC-04）。
- **Edge Runtime 制約**（Cloudflare Pages）により Node.js 専用 API（`crypto`、`fs` 等）は使用不可。`crypto.randomUUID()` 等の Web Crypto API を使用する。

---

## 2. エンドポイント一覧

### 認証・アカウント管理

| メソッド | パス | 概要 | 認証 | 要件ID |
|---|---|---|---|---|
| POST | `/api/auth/signup` | 会員登録 | 不要 | AUTH-01〜04 |
| POST | `/api/auth/login` | ログイン | 不要 | AUTH-05・06 |
| POST | `/api/auth/logout` | ログアウト | JWT | AUTH-08 |
| POST | `/api/auth/password-reset-request` | パスワードリセット申請 | 不要 | AUTH-09・10 |
| POST | `/api/auth/password-reset` | パスワードリセット実行 | 不要（リセットトークン） | AUTH-09・10 |
| PATCH | `/api/auth/profile` | 表示名変更 | JWT | AUTH-11 |
| PATCH | `/api/auth/email` | メールアドレス変更 | JWT | AUTH-12 |
| PATCH | `/api/auth/password` | パスワード変更 | JWT | AUTH-13 |
| DELETE | `/api/auth/account` | アカウント削除 | JWT | AUTH-14・15 |

### 店舗

| メソッド | パス | 概要 | 認証 | 要件ID |
|---|---|---|---|---|
| GET | `/api/shops` | 店舗一覧取得（フィルタ・ソート） | JWT | SHOP-14〜17 |
| POST | `/api/shops` | 店舗登録 | JWT | SHOP-01〜06 |
| GET | `/api/shops/[id]` | 店舗詳細取得 | JWT | SHOP-18 |
| PATCH | `/api/shops/[id]` | 店舗情報更新 | JWT | SHOP-19・20 |
| DELETE | `/api/shops/[id]` | 店舗削除 | JWT | SHOP-21 |
| GET | `/api/shops/places/search` | Google Places テキスト検索 | JWT | SHOP-02 |
| GET | `/api/shops/places/details` | Google Places 詳細取得 | JWT | SHOP-02・04 |
| GET | `/api/shops/places/from-url` | URL から店舗情報取得 | JWT | SHOP-03・04 |

### タグ

| メソッド | パス | 概要 | 認証 | 要件ID |
|---|---|---|---|---|
| GET | `/api/tags` | タグ一覧取得（候補表示） | JWT | SHOP-08 |
| POST | `/api/tags` | タグ新規作成 | JWT | SHOP-07 |
| DELETE | `/api/tags/[id]` | タグ削除 | JWT | SHOP-13 |

### 店舗タグ紐付け

| メソッド | パス | 概要 | 認証 | 要件ID |
|---|---|---|---|---|
| POST | `/api/shops/[id]/tags` | 店舗にタグを付与 | JWT | SHOP-09 |
| DELETE | `/api/shops/[id]/tags/[tagId]` | 店舗からタグを外す | JWT | SHOP-10 |

### イベント

| メソッド | パス | 概要 | 認証 | 要件ID |
|---|---|---|---|---|
| GET | `/api/events` | イベント一覧取得 | JWT | EVENT-11・11b |
| POST | `/api/events` | イベント作成 | JWT | EVENT-01〜04 |
| GET | `/api/events/[id]` | イベント詳細取得（オーナー用） | JWT | EVENT-11 |
| PATCH | `/api/events/[id]` | イベント更新（タイトル・説明） | JWT | EVENT-12 |
| DELETE | `/api/events/[id]` | イベント削除 | JWT | EVENT-13 |
| POST | `/api/events/[id]/close` | イベントクローズ | JWT | EVENT-10 |
| POST | `/api/events/[id]/shops` | 候補店舗追加 | JWT | EVENT-05 |
| DELETE | `/api/events/[id]/shops/[shopId]` | 候補店舗削除 | JWT | EVENT-05 |

### 投票（ゲストアクセス）

| メソッド | パス | 概要 | 認証 | 要件ID |
|---|---|---|---|---|
| GET | `/api/share/[token]` | share_token でイベント情報取得 | share_token | EVENT-07・08 |
| POST | `/api/share/[token]/votes` | 投票送信 | share_token | VOTE-01〜03 |
| GET | `/api/share/[token]/votes/results` | 投票結果取得 | share_token | VOTE-05・05a |

---

## 3. 共通仕様

### エラーレスポンス形式

すべての Route Handler は統一形式でエラーを返す。

```typescript
type ErrorResponse = {
  error: string        // 人間が読めるエラーメッセージ（日本語可）
  code?: string        // アプリ固有のエラーコード（オプション）
}
```

#### HTTP ステータスコード一覧

| ステータス | 用途 | レスポンス例 |
|---|---|---|
| 200 OK | 成功（GET・PATCH） | 対象リソース |
| 201 Created | 作成成功（POST） | 作成したリソース |
| 204 No Content | 削除成功（DELETE） | なし |
| 400 Bad Request | バリデーションエラー | `{ "error": "店舗名は必須です" }` |
| 401 Unauthorized | 認証エラー（JWT 無効・未設定） | `{ "error": "ログインが必要です" }` |
| 403 Forbidden | 権限エラー（他ユーザーのリソースへのアクセス） | `{ "error": "このリソースへのアクセス権限がありません" }` |
| 404 Not Found | リソース未検出 | `{ "error": "店舗が見つかりません" }` |
| 405 Method Not Allowed | 許可されていない HTTP メソッド | `{ "error": "このメソッドは許可されていません" }` |
| 409 Conflict | 重複エラー（同名タグ等） | `{ "error": "同名のタグがすでに存在します" }` |
| 410 Gone | クローズ済みイベントへのアクセス | `{ "error": "このイベントはクローズされています" }` |
| 422 Unprocessable Entity | 入力値が不正（外部 API エラー等） | `{ "error": "URLから店舗情報を取得できませんでした" }` |
| 429 Too Many Requests | レートリミット超過 | `{ "error": "リクエストが多すぎます。しばらく後にお試しください" }` |
| 500 Internal Server Error | サーバー内部エラー | `{ "error": "内部エラーが発生しました" }` |

### 成功レスポンス形式

単一リソース:

```typescript
// 200 / 201
type ShopResponse = {
  id: string
  name: string
  // ... リソースのフィールド
}
```

リスト:

```typescript
// 200
type ShopsResponse = {
  items: ShopResponse[]
  total: number  // ページネーション未実装の場合でも件数を返す
}
```

---

## 4. 認証方式

### JWT 認証（会員向けエンドポイント）

```
クライアント
  │ Cookie: sb-access-token（HttpOnly; Secure; SameSite=Lax）
  ▼
Route Handler
  │ createServerClient（@supabase/ssr）で Cookie から JWT を検証
  │ const { data: { user } } = await supabase.auth.getUser()
  │ user が null の場合 → 401 を返す
  ▼
Supabase（anon key + JWT）
  └── RLS が自動適用される
```

- `createServerClient` は `@supabase/ssr` パッケージの関数を使用。
- `SUPABASE_ANON_KEY` を使用する（service_role ではない）。
- セッション Cookie は Supabase Auth SSR helper が自動管理する。

### service_role 認証（share_token 経由のゲストアクセス）

```
ゲストブラウザ
  │ /api/share/[token] へリクエスト
  ▼
Route Handler
  │ createClient（@supabase/supabase-js）with service_role key
  │ share_token でイベントを検索
  │ events.closed_at が null でなければ → 410 を返す
  │ events が見つからなければ → 404 を返す
  ▼
Supabase（service_role）
  └── RLS をバイパスして直接アクセス
```

- `SUPABASE_SERVICE_ROLE_KEY` は Route Handler の実行環境（Cloudflare Workers の環境変数）にのみ保持。
- クライアントサイドのコードには絶対に含めない。
- service_role クライアントのインスタンスはリクエストスコープで生成し、グローバルに保持しない。

---

## 5. Route Handler 詳細

### 5.1 認証・アカウント管理

認証系の操作は基本的に Supabase Auth の SDK メソッドを呼び出す薄いラッパーとして実装する。

#### POST `/api/auth/signup`

**リクエスト:**

```typescript
type SignupRequest = {
  email: string      // 必須・メール形式
  password: string   // 必須・8文字以上・英数字混在（AUTH-03）
  displayName: string // 必須・1〜50文字（AUTH-04）
}
```

**処理:**

1. Zod でバリデーション（失敗時 400）
2. `supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })` を呼び出す
3. Supabase が確認メールを送信（AUTH-02）
4. DB Trigger（`on_auth_user_created`）が `profiles` レコードを自動生成

**レスポンス:**

```typescript
// 201
type SignupResponse = {
  message: string  // "確認メールを送信しました。メールのリンクをクリックして登録を完了してください"
}
```

---

#### POST `/api/auth/login`

**リクエスト:**

```typescript
type LoginRequest = {
  email: string
  password: string
}
```

**処理:**

1. Zod でバリデーション（失敗時 400）
2. `supabase.auth.signInWithPassword({ email, password })`
3. 成功時、SSR helper が Cookie をセット

**レスポンス:**

```typescript
// 200
type LoginResponse = {
  user: {
    id: string
    email: string
    displayName: string
  }
}
```

エラー時: Supabase Auth のエラーを 401 に変換して返す。

---

#### POST `/api/auth/logout`

**認証:** JWT 必須

**処理:**

1. `supabase.auth.signOut()`
2. SSR helper が Cookie を削除

**レスポンス:** 204 No Content

---

#### POST `/api/auth/password-reset-request`

**リクエスト:**

```typescript
type PasswordResetRequestRequest = {
  email: string
}
```

**処理:**

1. Zod でバリデーション
2. `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<APP_URL>/reset-password' })`
3. ユーザーが存在しない場合でも成功レスポンスを返す（メールアドレス列挙対策）

**レスポンス:**

```typescript
// 200
{ message: "パスワードリセット用のメールを送信しました（メールアドレスが登録済みの場合）" }
```

---

#### POST `/api/auth/password-reset`

**リクエスト:**

```typescript
type PasswordResetRequest = {
  password: string   // 8文字以上・英数字混在
}
```

**処理:**

1. Supabase のリセットリンクから発行されたセッショントークンを Cookie から取得
2. `supabase.auth.updateUser({ password })`

**レスポンス:** 200 `{ message: "パスワードを変更しました" }`

---

#### PATCH `/api/auth/profile`

**認証:** JWT 必須

**リクエスト:**

```typescript
type UpdateProfileRequest = {
  displayName: string  // 1〜50文字
}
```

**処理:**

1. JWT から `user.id` を取得
2. `profiles` テーブルの `display_name` を更新（RLS で本人のみ更新可）

**レスポンス:**

```typescript
// 200
type ProfileResponse = {
  id: string
  displayName: string
  updatedAt: string
}
```

---

#### PATCH `/api/auth/email`

**認証:** JWT 必須

**リクエスト:**

```typescript
type UpdateEmailRequest = {
  email: string  // 新しいメールアドレス
}
```

**処理:**

1. `supabase.auth.updateUser({ email })`
2. Supabase が確認メールを送信（AUTH-12）

**レスポンス:** 200 `{ message: "確認メールを送信しました" }`

---

#### PATCH `/api/auth/password`

**認証:** JWT 必須

**リクエスト:**

```typescript
type UpdatePasswordRequest = {
  currentPassword: string  // 現在のパスワード（AUTH-13）
  newPassword: string      // 8文字以上・英数字混在
}
```

**処理:**

1. `supabase.auth.signInWithPassword` で現在のパスワードを検証（失敗時 400）
2. `supabase.auth.updateUser({ password: newPassword })`

**レスポンス:** 200 `{ message: "パスワードを変更しました" }`

---

#### DELETE `/api/auth/account`

**認証:** JWT 必須

**処理:**

1. JWT から `user.id` を取得
2. DB Trigger（`on_profile_deleted`）が votes.voter_name を「退会済みユーザー」に匿名化（AUTH-15）
3. `profiles` を削除（FK cascade で shops・tags・events を削除）
4. service_role で `auth.users` からユーザーを削除（`supabase.auth.admin.deleteUser(userId)`）

**レスポンス:** 204 No Content

---

### 5.2 店舗

#### GET `/api/shops`

**認証:** JWT 必須

**クエリパラメータ:**

```typescript
type ShopsQuery = {
  category?: string      // ジャンルフィルタ
  priceRange?: string    // 価格帯フィルタ（`〜¥999` 等）
  tagId?: string         // タグID フィルタ
  area?: string          // エリアフィルタ
  sort?: 'created_at' | 'name'  // デフォルト: created_at
  order?: 'asc' | 'desc'        // デフォルト: desc（登録日新しい順）
}
```

**処理:**

1. JWT から `user.id` を取得
2. Drizzle ORM で `shops` を `user_id = auth.uid()` フィルタ + クエリパラメータのフィルタで取得
3. `tagId` 指定時は `shop_tags` JOIN

**レスポンス:**

```typescript
// 200
type ShopsResponse = {
  items: ShopListItem[]
  total: number
}

type ShopListItem = {
  id: string
  name: string
  area: string | null
  category: string | null
  priceRange: string | null
  photoUrl: string | null
  tags: { id: string; name: string }[]
  createdAt: string
}
```

---

#### POST `/api/shops`

**認証:** JWT 必須

**リクエスト:**

```typescript
type CreateShopRequest = {
  name: string              // 必須・1〜100文字
  area?: string
  address?: string
  phone?: string
  category?: string
  priceRange?: string       // price_range CHECK 制約の値のみ許可
  externalRating?: number   // 0.0〜5.0
  businessHours?: string
  websiteUrl?: string
  googleMapsUrl?: string
  sourceUrl?: string
  photoUrl?: string
  note?: string             // 最大1000文字
  tagIds?: string[]         // 既存タグIDの配列
}
```

**処理:**

1. Zod バリデーション（失敗時 400）
2. `shops` に INSERT（RLS: `user_id = auth.uid()`）
3. `tagIds` が指定されている場合、`shop_tags` に INSERT（対象タグの所有者確認も実施）
4. 作成した店舗を返す

**レスポンス:**

```typescript
// 201
type ShopResponse = {
  id: string
  name: string
  area: string | null
  address: string | null
  phone: string | null
  category: string | null
  priceRange: string | null
  externalRating: number | null
  businessHours: string | null
  websiteUrl: string | null
  googleMapsUrl: string | null
  sourceUrl: string | null
  photoUrl: string | null
  note: string | null
  tags: { id: string; name: string }[]
  createdAt: string
  updatedAt: string
}
```

---

#### GET `/api/shops/[id]`

**認証:** JWT 必須

**処理:**

1. `shops` を `id = [id] AND user_id = auth.uid()` で取得
2. 見つからない場合 404

**レスポンス:** 200 `ShopResponse`（上記と同型）

---

#### PATCH `/api/shops/[id]`

**認証:** JWT 必須

**リクエスト:**

```typescript
// 更新対象フィールドのみ指定（partial update）
type UpdateShopRequest = Partial<Omit<CreateShopRequest, 'tagIds'>>
```

**処理:**

1. Zod バリデーション
2. `shops` を `id = [id] AND user_id = auth.uid()` で更新（RLS が保護）
3. 見つからない場合 404

**レスポンス:** 200 `ShopResponse`

---

#### DELETE `/api/shops/[id]`

**認証:** JWT 必須

**処理:**

1. `shops` を `id = [id] AND user_id = auth.uid()` で削除
2. `shop_tags` は FK cascade で自動削除
3. 使用店舗数がゼロになったタグを自動削除（SHOP-13）: 削除後に `shop_tags` への参照がなくなったタグを `tags` から DELETE
4. 見つからない場合 404

**レスポンス:** 204 No Content

---

#### GET `/api/shops/places/search`

**認証:** JWT 必須

**クエリパラメータ:**

```typescript
type PlacesSearchQuery = {
  q: string     // 必須・検索キーワード（店名）
}
```

**処理:**

1. `q` が空の場合 400
2. Google Places API Text Search を呼び出す
3. 最大10件の候補を返す

**レスポンス:**

```typescript
// 200
type PlacesSearchResponse = {
  candidates: {
    placeId: string
    name: string
    address: string
    category: string | null
    priceLevel: number | null  // Google の price_level（0〜4）
    rating: number | null
    photoUrl: string | null
  }[]
}
```

---

#### GET `/api/shops/places/details`

**認証:** JWT 必須

**クエリパラメータ:**

```typescript
type PlacesDetailsQuery = {
  placeId: string   // 必須
}
```

**処理:**

1. Google Places API Place Details を呼び出す
2. `price_level` を `priceRange` ラベルに変換（7.1 変換ルール）

**レスポンス:**

```typescript
// 200
type PlacesDetailsResponse = {
  placeId: string
  name: string
  address: string
  area: string | null          // address から推定（都道府県・市区町村）
  phone: string | null
  category: string | null
  priceRange: string | null    // `〜¥999` 等のラベル
  externalRating: number | null
  businessHours: string | null // weekday_text を改行区切りで結合
  websiteUrl: string | null
  googleMapsUrl: string | null
  photoUrl: string | null
}
```

---

#### GET `/api/shops/places/from-url`

**認証:** JWT 必須

**クエリパラメータ:**

```typescript
type PlacesFromUrlQuery = {
  url: string   // 必須・Google マップ URL
}
```

**処理:**

1. URL から Place ID を抽出（正規表現で `place/ChI...` 形式を検出）
2. Place ID が取得できた場合は Place Details API を呼び出す（`/api/shops/places/details` と同様の処理）
3. Place ID が取得できない場合 422 を返す

**レスポンス:** 200 `PlacesDetailsResponse`

---

### 5.3 タグ

#### GET `/api/tags`

**認証:** JWT 必須

**処理:**

1. JWT から `user.id` を取得
2. `tags` を `user_id = auth.uid()` で取得（名前昇順）

**レスポンス:**

```typescript
// 200
type TagsResponse = {
  items: { id: string; name: string; createdAt: string }[]
}
```

---

#### POST `/api/tags`

**認証:** JWT 必須

**リクエスト:**

```typescript
type CreateTagRequest = {
  name: string   // 必須・1〜50文字
}
```

**処理:**

1. Zod バリデーション
2. `tags` に INSERT（`UNIQUE(user_id, name)` 制約で重複防止）
3. 同名タグが存在する場合 409

**レスポンス:**

```typescript
// 201
type TagResponse = {
  id: string
  name: string
  createdAt: string
}
```

---

#### DELETE `/api/tags/[id]`

**認証:** JWT 必須

**処理:**

1. `tags` を `id = [id] AND user_id = auth.uid()` で削除
2. `shop_tags` は FK cascade で自動削除
3. 見つからない場合 404

**レスポンス:** 204 No Content

---

### 5.4 店舗タグ紐付け

#### POST `/api/shops/[id]/tags`

**認証:** JWT 必須

**リクエスト:**

```typescript
type AddTagRequest = {
  tagId: string   // 必須
}
```

**処理:**

1. 対象 shop が `user_id = auth.uid()` であることを確認（なければ 404）
2. 対象 tag が `user_id = auth.uid()` であることを確認（なければ 404）
3. `shop_tags` に INSERT（`UNIQUE(shop_id, tag_id)` 制約で重複防止、重複時は 409）

**レスポンス:** 201 `{ shopId: string; tagId: string }`

---

#### DELETE `/api/shops/[id]/tags/[tagId]`

**認証:** JWT 必須

**処理:**

1. `shop_tags` を shop_id と tag_id で特定して DELETE
2. RLS（`shops.user_id = auth.uid()`）が適用
3. 削除後、タグの使用店舗数がゼロになった場合はタグを自動削除（SHOP-13）

**レスポンス:** 204 No Content

---

### 5.5 イベント

#### GET `/api/events`

**認証:** JWT 必須

**クエリパラメータ:**

```typescript
type EventsQuery = {
  status?: 'open' | 'closed' | 'all'  // デフォルト: all（EVENT-11b）
}
```

**処理:**

1. `events` を `owner_user_id = auth.uid()` で取得
2. `status = 'open'` の場合 `closed_at IS NULL` フィルタを追加
3. `status = 'closed'` の場合 `closed_at IS NOT NULL` フィルタを追加

**レスポンス:**

```typescript
// 200
type EventsResponse = {
  items: EventListItem[]
  total: number
}

type EventListItem = {
  id: string
  title: string
  description: string | null
  shareToken: string
  isOpen: boolean          // closed_at === null
  shopCount: number        // event_shops の件数
  voteCount: number        // votes の件数
  createdAt: string
  closedAt: string | null
}
```

---

#### POST `/api/events`

**認証:** JWT 必須

**リクエスト:**

```typescript
type CreateEventRequest = {
  title: string           // 必須・1〜100文字
  description?: string    // 最大500文字
  shopIds: string[]       // 必須・1件以上（EVENT-04）
}
```

**処理:**

1. Zod バリデーション（`shopIds` が空の場合 400）
2. 指定 `shopIds` がすべて `user_id = auth.uid()` の店舗であることを確認（そうでなければ 403）
3. `share_token` を `crypto.randomUUID()` で生成（UUID v4 は 128bit エントロピー、SEC-07）
4. `events` に INSERT
5. `event_shops` に INSERT（shopIds 分）

**レスポンス:**

```typescript
// 201
type CreateEventResponse = {
  id: string
  title: string
  description: string | null
  shareToken: string
  shareUrl: string          // `${APP_URL}/events/share/${shareToken}`
  shops: { id: string; name: string }[]
  createdAt: string
}
```

---

#### GET `/api/events/[id]`

**認証:** JWT 必須

**処理:**

1. `events` を `id = [id] AND owner_user_id = auth.uid()` で取得（なければ 404）
2. `event_shops` と JOIN して候補店舗一覧を取得
3. `votes` と JOIN して投票数を取得

**レスポンス:**

```typescript
// 200
type EventDetailResponse = {
  id: string
  title: string
  description: string | null
  shareToken: string
  shareUrl: string
  isOpen: boolean
  shops: {
    id: string
    shopId: string
    name: string
    category: string | null
    photoUrl: string | null
    voteCount: number
  }[]
  totalVoteCount: number
  createdAt: string
  closedAt: string | null
}
```

---

#### PATCH `/api/events/[id]`

**認証:** JWT 必須

**リクエスト:**

```typescript
type UpdateEventRequest = {
  title?: string       // 1〜100文字
  description?: string // 最大500文字
}
```

**処理:**

1. Zod バリデーション
2. `events` を `id = [id] AND owner_user_id = auth.uid()` で更新（なければ 404）

**レスポンス:** 200 `EventDetailResponse`

---

#### DELETE `/api/events/[id]`

**認証:** JWT 必須

**処理:**

1. `events` を `id = [id] AND owner_user_id = auth.uid()` で削除
2. FK cascade で `event_shops` / `votes` / `vote_choices` も削除

**レスポンス:** 204 No Content

---

#### POST `/api/events/[id]/close`

**認証:** JWT 必須

**処理:**

1. `events` を `id = [id] AND owner_user_id = auth.uid()` で取得（なければ 404）
2. すでに `closed_at IS NOT NULL` の場合 400（`{ "error": "このイベントはすでにクローズされています" }`）
3. `closed_at = NOW()` で UPDATE

**レスポンス:** 200 `{ id: string; closedAt: string }`

---

#### POST `/api/events/[id]/shops`

**認証:** JWT 必須

**リクエスト:**

```typescript
type AddEventShopsRequest = {
  shopIds: string[]   // 必須・1件以上
}
```

**処理:**

1. イベントが `owner_user_id = auth.uid()` であることを確認（なければ 404）
2. イベントがオープン中であることを確認（クローズ済みなら 410）
3. `shopIds` がすべて自分の店舗であることを確認（なければ 403）
4. `event_shops` に INSERT（重複は無視: `ON CONFLICT DO NOTHING`）

**レスポンス:** 201 `{ added: { id: string; shopId: string }[] }`

---

#### DELETE `/api/events/[id]/shops/[shopId]`

**認証:** JWT 必須

**処理:**

1. イベントが `owner_user_id = auth.uid()` であることを確認（なければ 404）
2. イベントがオープン中であることを確認（クローズ済みなら 410）
3. `event_shops` から `event_id = [id] AND shop_id = [shopId]` を DELETE
4. 削除後、イベントの候補店舗が0件になる場合は 400（`{ "error": "候補店舗は1件以上必要です" }`）

**レスポンス:** 204 No Content

---

### 5.6 投票（ゲストアクセス）

#### GET `/api/share/[token]`

**認証:** share_token（パスパラメータ）

**処理:**

1. service_role クライアントで `events` を `share_token = [token]` で取得（なければ 404）
2. `closed_at IS NOT NULL` の場合 410（`{ "error": "このイベントはクローズされています" }`）
3. `event_shops` を JOIN して候補店舗一覧を取得

**レスポンス:**

```typescript
// 200
type ShareEventResponse = {
  eventId: string
  title: string
  description: string | null
  shops: {
    eventShopId: string
    shopId: string
    name: string
    category: string | null
    photoUrl: string | null
  }[]
}
```

---

#### POST `/api/share/[token]/votes`

**認証:** share_token（パスパラメータ）

**リクエスト:**

```typescript
type CreateVoteRequest = {
  voterName: string       // 必須・1〜50文字（VOTE-03）
  eventShopIds: string[]  // 必須・1件以上（VOTE-02）
}
```

**処理:**

1. service_role クライアントで `share_token = [token]` のイベントを取得（なければ 404）
2. `closed_at IS NOT NULL` の場合 410
3. Zod バリデーション（失敗時 400）
4. `eventShopIds` がすべて当該イベントの候補店舗であることを確認（不正な場合 400）
5. `votes` に INSERT（`voter_name`, `event_id`, `user_id = null`）
6. `vote_choices` に INSERT（`eventShopIds` 分）

**備考:** 会員がログイン状態で投票する場合、リクエストの Cookie から JWT を取得して `user_id` を設定する（オプション。未ログイン状態でも投票可能）。

**レスポンス:**

```typescript
// 201
type CreateVoteResponse = {
  voteId: string
  voterName: string
}
```

---

#### GET `/api/share/[token]/votes/results`

**認証:** share_token（パスパラメータ）

**処理:**

1. service_role クライアントで `share_token = [token]` のイベントを取得（なければ 404）
2. イベントがクローズ済みでも結果は返す（VOTE-05a）
3. `vote_choices` を `event_shop_id` でグループ集計して得票数を返す

**レスポンス:**

```typescript
// 200
type VoteResultsResponse = {
  totalVotes: number
  results: {
    eventShopId: string
    shopId: string
    shopName: string
    voteCount: number
    isTopVoted: boolean   // 最多得票かどうか（同率最多は複数 true）
  }[]
}
```

---

## 6. share_token 検証方式

### 採用方針: Route Handler 内で検証

share_token の検証は `middleware.ts` ではなく、各 Route Handler 内で行う。

**理由:**

| 観点 | middleware 検証 | Route Handler 内検証（採用） |
|---|---|---|
| service_role キーの扱い | middleware で使用するとすべてのリクエストに適用されリスクが高い | 必要な Route Handler のみで使用 |
| エラーレスポンスの統一 | middleware からは JSON レスポンスを返しにくい | Route Handler の統一フォーマット（`{ error: string }`）で返せる |
| デバッグ容易性 | middleware のデバッグは困難 | 通常の関数として単体テスト可能 |
| 柔軟性 | 410（クローズ済み）と 404（存在しない）を区別しにくい | 詳細なエラーコードを返せる |

### 実装パターン

share_token 検証ロジックはヘルパー関数として切り出す:

```typescript
// src/lib/share-token.ts

import { createClient } from '@supabase/supabase-js'

type ShareTokenValidationResult =
  | { ok: true; event: { id: string; title: string; closedAt: Date | null } }
  | { ok: false; status: 404 | 410; error: string }

export async function validateShareToken(
  token: string
): Promise<ShareTokenValidationResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: event, error } = await supabase
    .from('events')
    .select('id, title, closed_at')
    .eq('share_token', token)
    .single()

  if (error || !event) {
    return { ok: false, status: 404, error: 'イベントが見つかりません' }
  }

  if (event.closed_at !== null) {
    return { ok: false, status: 410, error: 'このイベントはクローズされています' }
  }

  return { ok: true, event }
}
```

---

## 7. レートリミット設計

### 基本方針

v1.0 では Supabase Auth の組み込みレート制限（SEC-08）を主要な対策として利用する。カスタムレートリミットは認証エンドポイントのみ追加実装する。

### Supabase Auth の組み込み制限

| 対象 | 制限 |
|---|---|
| ログイン失敗 | 5回/15分（デフォルト。Supabase ダッシュボードで設定） |
| サインアップ | 3回/時（メールアドレスごと） |
| パスワードリセット | 2回/時（メールアドレスごと） |

### カスタムレートリミット（Cloudflare Pages のキャッシュ/KV を使用）

v1.0 では実装コストを抑えるため、**IP ベースの簡易チェックを Route Handler 内で実装**する。

対象エンドポイント:

| エンドポイント | 制限 | 理由 |
|---|---|---|
| `POST /api/share/[token]/votes` | 10回/分/IP | ゲストによる連続投票を抑制（VOTE-06 で重複チェック自体は v1.0 では不実装だが、スパム対策として最低限必要） |
| `GET /api/shops/places/search` | 30回/分/IP | Google Places API のコスト抑制（PERF-02）|

実装:

```
リクエスト受信
  ↓
X-Forwarded-For ヘッダーから IP アドレスを取得
  ↓
Cloudflare KV（または IN-MEMORY Map + TTL）でカウントをインクリメント
  ↓
制限超過 → 429 Too Many Requests を返す
超過なし → 処理続行
```

**注意:** Cloudflare Pages の Edge Runtime では KV バインディングが利用可能。v1.0 では Cloudflare Workers KV の代わりに、次善策として `Cache-Control` ヘッダーによる Cloudflare CDN レベルのキャッシュを活用する。本格的なレートリミットは v2.0 で Cloudflare Workers KV または Upstash Redis で実装する。

---

## 8. CORS ポリシー

### 基本方針

- Route Handler は同一オリジン（Cloudflare Pages）からのみアクセスを想定するため、**CORS は明示的に設定しない**（Same-Origin Policy のデフォルト動作を利用）。
- 将来的にネイティブアプリや別ドメインのクライアントから API を利用する場合（EXT-01）は、明示的に CORS ヘッダーを追加する。

### v1.0 での設定

```typescript
// next.config.ts（またはRoute Handler内のレスポンスヘッダー）
// 同一オリジンのみ許可（デフォルト動作）
// CORS ヘッダーは追加しない
```

**プリフライトリクエスト（OPTIONS）**は Next.js が自動処理する。

---

## 9. Realtime 設計

### 対象: 投票結果のリアルタイム表示（VOTE-04）

オーナーが投票結果をリアルタイムで確認できる機能は Supabase Realtime を使用する。

### アーキテクチャ

```
イベント詳細ページ（オーナー閲覧・S-11）
  │ Client Component（"use client"）
  │
  ├── 初回データ: GET /api/events/[id]（Server Component でフェッチ）
  │
  └── リアルタイム更新: Supabase Realtime subscription
        │
        │ テーブル: votes / vote_choices
        │ フィルタ: event_id=eq.[eventId]
        ▼
      votes テーブルへの INSERT を検知
        ↓
      GET /api/events/[id] を再フェッチ（または楽観的更新）
```

### Realtime チャンネル設計

```typescript
// イベント詳細ページ（Client Component）
const channel = supabase
  .channel(`event-votes-${eventId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'votes',
      filter: `event_id=eq.${eventId}`,
    },
    (_payload) => {
      // 投票集計を再取得
      refreshVoteResults()
    }
  )
  .subscribe()
```

### 認証

- Realtime subscription は Supabase クライアント（anon key + JWT Cookie）で接続する。
- `votes` テーブルの RLS（オーナーのみ SELECT 可）が Realtime にも適用されるため、他ユーザーの投票通知は受信できない。

### ゲストの投票結果確認（VOTE-05a）

参加者（ゲスト）の結果画面では v1.0 でリアルタイム更新は行わない。手動更新ボタン押下時に `GET /api/share/[token]/votes/results` を呼び出す。
