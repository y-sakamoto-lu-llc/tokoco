# バリデーション戦略

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-29
**ステータス:** Draft

---

## 目次

1. [バリデーション層アーキテクチャ](#1-バリデーション層アーキテクチャ)
2. [Zod スキーマの配置方針](#2-zod-スキーマの配置方針)
3. [エンティティ別スキーマ定義](#3-エンティティ別スキーマ定義)
   - 3.1 認証・アカウント管理
   - 3.2 店舗
   - 3.3 タグ
   - 3.4 イベント
   - 3.5 投票
4. [Route Handler でのバリデーション実装パターン](#4-route-handler-でのバリデーション実装パターン)
5. [フォームバリデーションパターン（React Hook Form + Zod）](#5-フォームバリデーションパターンreact-hook-form--zod)
6. [バリデーションエラーのレスポンス形式](#6-バリデーションエラーのレスポンス形式)
7. [ビジネスルールバリデーション](#7-ビジネスルールバリデーション)
8. [XSS 対策と出力エスケープ方針](#8-xss-対策と出力エスケープ方針)
9. [将来の拡張対応](#9-将来の拡張対応)

---

## 1. バリデーション層アーキテクチャ

### 二重バリデーション原則

すべての入力値はクライアント側とサーバー側の両方でバリデーションを行う（SEC-04）。

```
ブラウザ（クライアント）                   サーバー（Route Handler）
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│ React Hook Form + zodResolver   │       │ Zod の safeParse / parse         │
│ ・即時フィードバック（UX向上）   │  →→→  │ ・必ず再バリデーション（SEC-04）  │
│ ・送信前のガード                │       │ ・失敗時は 400 を返す             │
└─────────────────────────────────┘       └──────────────────────────────────┘
         ↑ 共有                                         ↑ 共有
         └──────── src/lib/validations/<feature>.ts ────┘
```

**重要:** クライアントバリデーションは UX のためであり、セキュリティの保証にはならない。Route Handler では必ず独立してバリデーションを再実行する。

### 責務の分担

| バリデーション種別 | 実施場所 | 使用ツール |
|---|---|---|
| フォーマット・型・長さチェック | クライアント + サーバー | Zod（共有スキーマ） |
| ビジネスルール（候補店舗数の最小値等） | サーバーのみ | Zod + DB クエリ |
| 一意性チェック（タグ名の重複等） | サーバーのみ | DB の UNIQUE 制約 + 409 レスポンス |
| 認証・認可チェック | サーバーのみ | Supabase Auth + RLS |

---

## 2. Zod スキーマの配置方針

### ディレクトリ構成

```
src/lib/validations/
├── auth.ts          # 認証・アカウント管理
├── shop.ts          # 店舗
├── tag.ts           # タグ
├── event.ts         # イベント
└── vote.ts          # 投票
```

### 命名規則

```typescript
// インプット（フォーム送信・リクエストボディ）: <動詞><エンティティ>Schema
export const createShopSchema = z.object({ ... })
export const updateShopSchema = z.object({ ... })
export const signupSchema = z.object({ ... })

// 型エクスポート: スキーマ名から "Schema" を取り除いて Input サフィックスを付ける
export type CreateShopInput = z.infer<typeof createShopSchema>
export type UpdateShopInput = z.infer<typeof updateShopSchema>
export type SignupInput = z.infer<typeof signupSchema>
```

### インポートパターン

```typescript
// Route Handler（サーバー）
import { createShopSchema } from '@/lib/validations/shop'

// フォームコンポーネント（クライアント）
import { createShopSchema, type CreateShopInput } from '@/lib/validations/shop'
```

---

## 3. エンティティ別スキーマ定義

### 3.1 認証・アカウント管理

**ファイル:** `src/lib/validations/auth.ts`

```typescript
import { z } from 'zod'

// パスワードの共通ルール（AUTH-03）
const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .regex(/[a-zA-Z]/, 'パスワードには英字を含めてください')
  .regex(/[0-9]/, 'パスワードには数字を含めてください')

// 会員登録（AUTH-01〜04）
export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('正しいメールアドレス形式で入力してください')
    .max(254, 'メールアドレスが長すぎます'),
  password: passwordSchema,
  displayName: z
    .string()
    .min(1, '表示名は必須です')
    .max(50, '表示名は50文字以内で入力してください')
    .trim(),
})
export type SignupInput = z.infer<typeof signupSchema>

// ログイン（AUTH-05）
export const loginSchema = z.object({
  email: z.string().min(1, 'メールアドレスは必須です').email('正しいメールアドレス形式で入力してください'),
  password: z.string().min(1, 'パスワードは必須です'),
})
export type LoginInput = z.infer<typeof loginSchema>

// パスワードリセット申請（AUTH-09）
export const passwordResetRequestSchema = z.object({
  email: z.string().min(1, 'メールアドレスは必須です').email('正しいメールアドレス形式で入力してください'),
})
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>

// パスワードリセット実行（AUTH-09・10）
export const passwordResetSchema = z.object({
  password: passwordSchema,
})
export type PasswordResetInput = z.infer<typeof passwordResetSchema>

// 表示名変更（AUTH-11）
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, '表示名は必須です')
    .max(50, '表示名は50文字以内で入力してください')
    .trim(),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

// メールアドレス変更（AUTH-12）
export const updateEmailSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('正しいメールアドレス形式で入力してください')
    .max(254, 'メールアドレスが長すぎます'),
})
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>

// パスワード変更（AUTH-13）
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードは必須です'),
  newPassword: passwordSchema,
})
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
```

### 3.2 店舗

**ファイル:** `src/lib/validations/shop.ts`

```typescript
import { z } from 'zod'

// price_range の許容値（DB の CHECK 制約と同期）
export const PRICE_RANGE_VALUES = [
  '〜¥999',
  '¥1,000〜¥2,999',
  '¥3,000〜¥5,999',
  '¥6,000〜¥9,999',
  '¥10,000〜',
  '価格帯不明',
] as const
export type PriceRange = (typeof PRICE_RANGE_VALUES)[number]

// URL フィールドの共通バリデーター（空文字を null 扱いに統一）
const optionalUrl = z
  .string()
  .url('正しいURL形式で入力してください')
  .max(2048, 'URLが長すぎます')
  .or(z.literal(''))
  .transform((v) => v || null)
  .nullable()
  .optional()

// 店舗作成（SHOP-01〜06）
export const createShopSchema = z.object({
  name: z
    .string()
    .min(1, '店舗名は必須です')
    .max(100, '店舗名は100文字以内で入力してください')
    .trim(),
  area: z.string().max(100, 'エリアは100文字以内で入力してください').trim().optional(),
  address: z.string().max(200, '住所は200文字以内で入力してください').trim().optional(),
  phone: z
    .string()
    .max(20, '電話番号は20文字以内で入力してください')
    .regex(/^[\d\-+() ]*$/, '電話番号は数字・ハイフン・括弧のみ使用できます')
    .optional(),
  category: z.string().max(50, 'カテゴリは50文字以内で入力してください').trim().optional(),
  priceRange: z.enum(PRICE_RANGE_VALUES).optional(),
  externalRating: z
    .number()
    .min(0, '評価は0以上の値を入力してください')
    .max(5, '評価は5以下の値を入力してください')
    .optional(),
  businessHours: z.string().max(500, '営業時間は500文字以内で入力してください').optional(),
  websiteUrl: optionalUrl,
  googleMapsUrl: optionalUrl,
  sourceUrl: optionalUrl,
  photoUrl: optionalUrl,
  note: z.string().max(1000, 'メモは1000文字以内で入力してください').trim().optional(),
})
export type CreateShopInput = z.infer<typeof createShopSchema>

// 店舗更新（SHOP-19・20）
export const updateShopSchema = createShopSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: '更新するフィールドを1つ以上指定してください' },
)
export type UpdateShopInput = z.infer<typeof updateShopSchema>

// 店舗一覧取得のクエリパラメータ（SHOP-16・17）
export const shopListQuerySchema = z.object({
  category: z.string().optional(),
  priceRange: z.enum(PRICE_RANGE_VALUES).optional(),
  tagId: z.string().uuid('tagId は UUID 形式で指定してください').optional(),
  area: z.string().optional(),
  sort: z.enum(['created_at', 'name']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
})
export type ShopListQuery = z.infer<typeof shopListQuerySchema>

// Google Places テキスト検索（SHOP-02）
export const placesSearchQuerySchema = z.object({
  query: z
    .string()
    .min(1, '検索キーワードは必須です')
    .max(200, '検索キーワードは200文字以内で入力してください')
    .trim(),
})
export type PlacesSearchQuery = z.infer<typeof placesSearchQuerySchema>

// Google Places 詳細取得（SHOP-02・04）
export const placesDetailsQuerySchema = z.object({
  placeId: z.string().min(1, 'placeId は必須です'),
})
export type PlacesDetailsQuery = z.infer<typeof placesDetailsQuerySchema>

// URL から店舗情報取得（SHOP-03）
export const placesFromUrlSchema = z.object({
  url: z
    .string()
    .min(1, 'URLは必須です')
    .url('正しいURL形式で入力してください')
    .max(2048, 'URLが長すぎます'),
})
export type PlacesFromUrlInput = z.infer<typeof placesFromUrlSchema>
```

### 3.3 タグ

**ファイル:** `src/lib/validations/tag.ts`

```typescript
import { z } from 'zod'

// タグ作成（SHOP-07）
export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, 'タグ名は必須です')
    .max(30, 'タグ名は30文字以内で入力してください')
    .trim(),
})
export type CreateTagInput = z.infer<typeof createTagSchema>

// 店舗へのタグ付与（SHOP-09）
export const attachTagSchema = z.object({
  tagId: z.string().uuid('tagId は UUID 形式で指定してください'),
})
export type AttachTagInput = z.infer<typeof attachTagSchema>
```

### 3.4 イベント

**ファイル:** `src/lib/validations/event.ts`

```typescript
import { z } from 'zod'

// イベント作成（EVENT-01〜04）
export const createEventSchema = z.object({
  title: z
    .string()
    .min(1, 'イベントタイトルは必須です')
    .max(100, 'イベントタイトルは100文字以内で入力してください')
    .trim(),
  description: z
    .string()
    .max(1000, 'イベント説明は1000文字以内で入力してください')
    .trim()
    .optional(),
  shopIds: z
    .array(z.string().uuid('shopId は UUID 形式で指定してください'))
    .min(1, '候補店舗を1件以上選択してください'),  // EVENT-04
})
export type CreateEventInput = z.infer<typeof createEventSchema>

// イベント更新（EVENT-12）
export const updateEventSchema = z.object({
  title: z
    .string()
    .min(1, 'イベントタイトルは必須です')
    .max(100, 'イベントタイトルは100文字以内で入力してください')
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, 'イベント説明は1000文字以内で入力してください')
    .trim()
    .optional(),
}).refine(
  (data) => data.title !== undefined || data.description !== undefined,
  { message: '更新するフィールドを1つ以上指定してください' },
)
export type UpdateEventInput = z.infer<typeof updateEventSchema>

// 候補店舗追加（EVENT-05）
export const addEventShopSchema = z.object({
  shopId: z.string().uuid('shopId は UUID 形式で指定してください'),
})
export type AddEventShopInput = z.infer<typeof addEventShopSchema>

// イベント一覧クエリ（EVENT-11・11b）
export const eventListQuerySchema = z.object({
  status: z.enum(['open', 'closed', 'all']).default('all'),
})
export type EventListQuery = z.infer<typeof eventListQuerySchema>
```

### 3.5 投票

**ファイル:** `src/lib/validations/vote.ts`

```typescript
import { z } from 'zod'

// 投票送信（VOTE-01〜03）
export const createVoteSchema = z.object({
  voterName: z
    .string()
    .min(1, '投票者名は必須です')          // ゲストは必須（VOTE-03）
    .max(50, '投票者名は50文字以内で入力してください')
    .trim(),
  eventShopIds: z
    .array(z.string().uuid('eventShopId は UUID 形式で指定してください'))
    .min(1, '少なくとも1件の候補店舗を選択してください'),  // VOTE-02
})
export type CreateVoteInput = z.infer<typeof createVoteSchema>
```

---

## 4. Route Handler でのバリデーション実装パターン

### 基本パターン

```typescript
// src/app/api/shops/route.ts
import { NextResponse } from 'next/server'
import { createShopSchema } from '@/lib/validations/shop'

export async function POST(request: Request) {
  // 1. リクエストボディのパース
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  // 2. Zod バリデーション（safeParse を使用してエラーをハンドリング）
  const result = createShopSchema.safeParse(body)
  if (!result.success) {
    const firstError = result.error.errors[0]
    return NextResponse.json(
      { error: firstError?.message ?? 'バリデーションエラーが発生しました' },
      { status: 400 },
    )
  }

  // 3. バリデーション済みデータを使用（型安全）
  const data = result.data

  // ... DB 処理 ...
}
```

### クエリパラメータのバリデーション

```typescript
// src/app/api/shops/route.ts
import { shopListQuerySchema } from '@/lib/validations/shop'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawQuery = Object.fromEntries(searchParams)

  const result = shopListQuerySchema.safeParse(rawQuery)
  if (!result.success) {
    const firstError = result.error.errors[0]
    return NextResponse.json(
      { error: firstError?.message ?? 'クエリパラメータが不正です' },
      { status: 400 },
    )
  }

  const { category, priceRange, tagId, area, sort, order } = result.data
  // ... DB クエリ ...
}
```

### エラーの詳細を返す場合（開発用途）

開発環境では Zod の詳細エラーをレスポンスに含められるが、本番環境では `firstError.message` のみを返す。

```typescript
if (!result.success) {
  const firstError = result.error.errors[0]
  return NextResponse.json(
    {
      error: firstError?.message ?? 'バリデーションエラーが発生しました',
      // 本番環境では details を含めない
      ...(process.env.NODE_ENV === 'development' && {
        details: result.error.flatten().fieldErrors,
      }),
    },
    { status: 400 },
  )
}
```

---

## 5. フォームバリデーションパターン（React Hook Form + Zod）

### 基本パターン

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createShopSchema, type CreateShopInput } from '@/lib/validations/shop'

export function CreateShopForm() {
  const form = useForm<CreateShopInput>({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      name: '',
      note: '',
    },
  })

  const onSubmit = async (data: CreateShopInput) => {
    const res = await fetch('/api/shops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    // ... レスポンス処理 ...
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
      {form.formState.errors.name && (
        <p role="alert">{form.formState.errors.name.message}</p>
      )}
      {/* ... */}
    </form>
  )
}
```

### サーバーサイドエラーの表示パターン

```typescript
const onSubmit = async (data: CreateShopInput) => {
  const res = await fetch('/api/shops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const { error } = await res.json() as { error: string }
    // フォームのルートエラーとして表示
    form.setError('root', { message: error })
    return
  }

  // 成功処理
}
```

### バリデーションのタイミング

| 設定 | 動作 | 適用場面 |
|---|---|---|
| `mode: 'onBlur'`（デフォルト推奨） | フォーカスが外れた時にバリデーション | 標準フォーム |
| `mode: 'onChange'` | 入力のたびにバリデーション | リアルタイムフィードバックが必要な場合（パスワード強度表示等） |
| `mode: 'onSubmit'` | 送信時のみバリデーション | シンプルな確認フォーム |

標準は `mode: 'onBlur'` を使用する。パスワードフォームなど、入力中にリアルタイムフィードバックが必要な箇所は `mode: 'onChange'` を使用する。

---

## 6. バリデーションエラーのレスポンス形式

### エラーレスポンス（`05_api-route-handlers.md` の共通仕様に準拠）

```typescript
type ErrorResponse = {
  error: string    // 人間が読めるエラーメッセージ（日本語）
  code?: string    // アプリ固有のエラーコード（オプション）
}
```

バリデーションエラーは HTTP 400 で返す。

### 単一フィールドエラーの形式

複数フィールドにエラーがある場合でも、**最初のエラーメッセージ1件**のみを `error` フィールドに含めて返す。

理由: フロントエンドのフォームバリデーションが先行して複数エラーを表示するため、Route Handler のエラーレスポンスでは冗長な詳細を返さない（UX 的な混乱を避ける）。

```json
// 良い例（最初のエラーのみ）
{ "error": "店舗名は必須です" }

// 避ける例（複数エラーをオブジェクトで返す）
{
  "errors": {
    "name": ["店舗名は必須です"],
    "note": ["メモは1000文字以内で入力してください"]
  }
}
```

### エラーコードの利用

`code` フィールドは、クライアント側でエラー種別に応じた分岐処理が必要な場合にのみ付与する。

```json
// メール確認未完了（AUTH-02a）
{ "error": "メールアドレスの確認が完了していません。確認メールのリンクをクリックしてください", "code": "email_not_confirmed" }

// タグ重複（SHOP-07）
{ "error": "同名のタグがすでに存在します", "code": "tag_already_exists" }

// クローズ済みイベント（EVENT-10）
{ "error": "このイベントはクローズされています", "code": "event_closed" }
```

---

## 7. ビジネスルールバリデーション

フォーマットチェック（Zod）だけでは検証できないビジネスルールは、Route Handler 内で DB クエリを使って確認する。

### 一覧

| ルール | 要件ID | 実施場所 | エラーコード |
|---|---|---|---|
| タグ名はユーザーごとにユニーク | SHOP-07 | DB UNIQUE 制約 → Route Handler で 409 返却 | `tag_already_exists` |
| 候補店舗は1件以上 | EVENT-04 | `createEventSchema` の `.min(1)` | - |
| 候補店舗はイベントオーナーの `shops` に存在する | EVENT-03 | Route Handler で SELECT して確認 | - |
| イベントがオープン中であること（投票） | VOTE-01 | Route Handler で `closed_at IS NULL` を確認 | `event_closed` |
| share_token が存在すること（投票） | VOTE-01 | Route Handler で SELECT して確認 | - |
| 候補店舗が当該イベントに属すること | VOTE-02 | Route Handler で `event_shops` テーブルを確認 | - |

### DB UNIQUE 制約エラーのハンドリング

```typescript
try {
  await db.insert(tags).values({ userId, name })
} catch (err) {
  // Supabase / PostgreSQL の UNIQUE 制約違反
  if (err instanceof Error && err.message.includes('unique')) {
    return NextResponse.json(
      { error: '同名のタグがすでに存在します', code: 'tag_already_exists' },
      { status: 409 },
    )
  }
  throw err
}
```

---

## 8. XSS 対策と出力エスケープ方針

SEC-05 の要件に従い、出力エスケープを徹底する。

### React のデフォルトエスケープ

React は JSX の式（`{value}`）内のテキストを自動的にエスケープする。`<script>` タグなどの HTML インジェクションは防止される。

```tsx
// 安全: React が自動エスケープ
<p>{shop.name}</p>
<p>{shop.note}</p>
```

### `dangerouslySetInnerHTML` の禁止

`dangerouslySetInnerHTML` は使用しない。外部から取得したテキスト（Google Places API のデータ、ユーザー入力）をそのまま HTML として埋め込まない。

```tsx
// 禁止
<div dangerouslySetInnerHTML={{ __html: shop.description }} />

// 代替: テキストとして表示（改行は CSS white-space: pre-wrap で対応）
<div style={{ whiteSpace: 'pre-wrap' }}>{shop.description}</div>
```

### URL フィールドの安全な出力

ユーザーが入力した URL（`website_url`、`google_maps_url`）を `<a>` タグの `href` に使用する場合、`javascript:` スキームを除外する。

```typescript
// src/lib/validations/shop.ts の optionalUrl に以下を追加
const safeUrl = z
  .string()
  .url()
  .refine(
    (url) => {
      const lower = url.toLowerCase()
      return !lower.startsWith('javascript:') && !lower.startsWith('data:')
    },
    { message: '安全でないURLは使用できません' },
  )
```

```tsx
// コンポーネントでの使用
function SafeLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return null
  const lower = href.toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}
```

### DB 保存前のサニタイズ方針

- Zod の `.trim()` を使用して前後の空白を除去する（スキーマ定義を参照）
- HTML タグの除去（サニタイズ）は行わない。React のエスケープに依存する
- SQL インジェクション対策は Drizzle ORM のプリペアドステートメントに依存する（直接の文字列結合は行わない）

---

## 9. 将来の拡張対応

### フリーミアム制限バリデーション（EXT-03）

v2.0 以降でフリーミアムモデルを導入する際、以下のビジネスルールバリデーションを Route Handler に追加する。

```typescript
// 無料枠: マイリスト登録50件
const shopCount = await db
  .select({ count: count() })
  .from(shops)
  .where(eq(shops.userId, userId))

if (shopCount[0].count >= 50) {
  return NextResponse.json(
    { error: '無料プランの登録上限（50件）に達しています', code: 'free_limit_exceeded' },
    { status: 403 },
  )
}
```

現時点では上限チェックは実装しないが、リソース使用量を記録できるデータ構造（`shops.user_id` による集計が可能な現スキーマ）は v1.0 から維持する（EXT-03）。

### スキーマのバージョニング

API バージョニングが必要になった際は、スキーマファイルをバージョン別に分ける。

```
src/lib/validations/
├── v1/
│   └── shop.ts
└── v2/
    └── shop.ts
```

v1.0 では単一ディレクトリで管理する。
