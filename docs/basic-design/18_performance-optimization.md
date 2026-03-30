# パフォーマンス最適化戦略

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-29
**ステータス:** Draft

---

## 対象要件

| 要件ID | 内容 | 目標値 |
|---|---|---|
| PERF-01 | ページの初期表示（LCP） | 3秒以内（通常の4G回線を想定） |
| PERF-02 | 店舗検索の候補表示 | 入力から1秒以内 |
| PERF-03 | 投票送信〜完了表示 | 2秒以内 |

---

## 1. Core Web Vitals 目標値

| 指標 | 目標値 | 計測対象画面 |
|---|---|---|
| LCP（Largest Contentful Paint） | ≤3.0秒（4G回線） | S-06（マイリスト）・S-12（共有ページ） |
| INP（Interaction to Next Paint） | ≤200ms | 全画面 |
| CLS（Cumulative Layout Shift） | ≤0.1 | 全画面 |
| TTFB（Time to First Byte） | ≤600ms | Edge Runtime から配信 |

### 計測方法

- ローカル: Chrome DevTools Lighthouse（スロットリング: 4G相当）
- CI: `pnpm run build && pnpm run start` 後に Lighthouse CLI を実行（スコア 90 以上を目標）
- 本番モニタリング: Cloudflare Web Analytics（将来的に導入検討）

---

## 2. LCP最適化戦略（PERF-01）

### 2.1 Server Components によるサーバーサイドレンダリング

App Router のデフォルト挙動（Server Components）を活用し、データフェッチをサーバー側で完結させる。

```
[ブラウザ] ← 完成済みHTML ← [Edge Runtime] ← [Supabase]
```

- `"use client"` は状態管理・イベントハンドラが必要なコンポーネントにのみ付与する
- `app/(app)/layout.tsx` から `children` に props を直接渡すことはできないため、各 Server Component / `page.tsx` でデータフェッチを行う
- 認証チェックは `middleware.ts` で Edge Runtime 上で行い、不要なレンダリングを防ぐ

### 2.2 フォント読み込み（next/font）

Google Fonts は `next/font/google` を使用してビルド時にサブセット化・最適化する。
セルフホスティングにより外部ドメインへのリクエストを削減する。

```typescript
// src/app/layout.tsx
import { Noto_Sans_JP } from 'next/font/google'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',  // CLS 対策: フォント読み込み前はシステムフォントで表示
})
```

- `display: 'swap'` を指定し、フォント未読み込み時にシステムフォントで表示してCLSを防ぐ
- 使用するウェイトを必要最小限（400・500・700）に絞る

### 2.3 画像最適化（next/image）

店舗写真は必ず `next/image` コンポーネントを使用する。

```typescript
import Image from 'next/image'

<Image
  src={shop.photo_url}
  alt={shop.name}
  width={400}
  height={300}
  sizes="(max-width: 640px) 100vw, 400px"
  priority={isAboveFold}  // ファーストビューの画像のみ priority=true
/>
```

| 設定項目 | 方針 |
|---|---|
| フォーマット | WebP（next/image が自動変換） |
| `priority` | ファーストビューに表示される画像（1件目のカード等）のみ `true`。それ以外は `false`（遅延読み込み） |
| `sizes` | 画面幅に応じた適切な `sizes` を指定しダウンロードサイズを最小化 |
| ドメイン許可 | Google Places の写真URL（`maps.googleapis.com` 等）を `next.config.ts` の `images.remotePatterns` に追加 |

`next.config.ts` の設定例:

```typescript
const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}
```

### 2.4 クリティカルCSS・JS読み込み戦略

- Tailwind CSS は `@layer` によるパージで未使用スタイルを削除（ビルド時に自動）
- `<head>` 内のスクリプトは原則 `defer` / `async` 付与
- サードパーティスクリプト（Google Places API の JavaScript SDK 等）はルートレベルでは読み込まず、店舗追加フォームのコンポーネントが mount されたときに動的ロードする

```typescript
// 店舗追加フォーム内でのみ読み込む（Server Component から dynamic import）
const ShopAddForm = dynamic(() => import('@/components/shop/ShopAddForm'), {
  loading: () => <Skeleton />,
})
```

---

## 3. 検索レスポンス最適化（PERF-02）

### 3.1 デバウンス設定

入力中に毎キーストロークで API を呼び出さないよう、デバウンスを設定する。

| 設定値 | 理由 |
|---|---|
| debounce: 300ms | 入力停止から300ms後に呼び出す。タイピング速度（平均200〜400ms/文字）を考慮し、入力中の無駄なリクエストを削減しつつ体感遅延を最小化 |
| 最小文字数: 2文字 | 1文字での検索は候補が多すぎ Google Places の費用対効果が低いため、2文字以上で検索を開始する |

実装イメージ（`use-debounce` ライブラリ または `setTimeout` + `useEffect` で実装）:

```typescript
const [query, setQuery] = useState('')
const debouncedQuery = useDebounce(query, 300)

useEffect(() => {
  if (debouncedQuery.length < 2) return
  // Route Handler を呼び出す
  fetch(`/api/shops/places?q=${encodeURIComponent(debouncedQuery)}`)
}, [debouncedQuery])
```

### 3.2 APIレスポンスキャッシュ

Google Places API のリクエストには Route Handler 側でキャッシュを設定する。

```typescript
// src/app/api/shops/places/route.ts
export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''

  // ... Google Places API 呼び出し

  return new Response(JSON.stringify(results), {
    headers: {
      'Content-Type': 'application/json',
      // 同一クエリは60秒間ブラウザ側でキャッシュ
      'Cache-Control': 'private, max-age=60',
    },
  })
}
```

- 同一検索ワードの重複リクエストをブラウザキャッシュで防ぐ（`Cache-Control: private, max-age=60`）
- ここで設定する `Cache-Control` はブラウザ向けの HTTP レスポンスヘッダーであり、Next.js の Data Cache（`fetch` の `next.revalidate` 等）とは別の概念である
- Cloudflare CDN でのキャッシュは **行わない**（ユーザーごとの検索文脈が異なるため `private` を指定）

### 3.3 DBインデックス活用

`04_database.md` で定義済みのインデックスにより、フィルタリングクエリのフルスキャンを防ぐ。

```sql
-- 例: ユーザーの店舗一覧をカテゴリで絞り込む場合
-- idx_shops_user_category (user_id, category) が有効
SELECT * FROM shops
WHERE user_id = $1 AND category = $2;
```

新規クエリを追加する際は `EXPLAIN ANALYZE` でインデックスが使用されていることを確認する。

---

## 4. 投票送信最適化（PERF-03）

### 4.1 Optimistic UI の採用

投票送信後、APIレスポンスを待たずに即座にUI上で送信済み状態を表示する（楽観的更新）。

```
[ユーザーが送信] → [UIを即座に送信済み表示] → [APIリクエスト] → [成功: そのまま] / [失敗: 元の状態に戻す]
```

実装方針:

```typescript
// 投票フォームコンポーネント（Client Component）
const [optimisticState, setOptimisticState] = useState<'idle' | 'submitted'>('idle')

async function handleSubmit(data: VoteFormData) {
  // 1. 即座にUIを更新
  setOptimisticState('submitted')

  // 2. APIリクエスト
  const result = await submitVote(data)

  // 3. 失敗時はロールバック
  if (!result.ok) {
    setOptimisticState('idle')
    toast.error('投票に失敗しました。もう一度お試しください。')
  }
}
```

- React 19 の `useOptimistic` フックの使用も検討する（Next.js 15 + React 19 環境のため利用可能）
- 失敗時のエラーメッセージはトースト通知で表示し、フォームを操作可能な状態に戻す

### 4.2 投票 Route Handler の最適化

```typescript
// src/app/api/votes/route.ts
export const runtime = 'edge'

// votes と vote_choices を1トランザクションで INSERT
// service_role クライアントを使用（RLS バイパス）
```

- `votes` と `vote_choices` の INSERT はトランザクションで一括実行し、往復回数を最小化する
- ゲスト（共有リンク経由）は `anon` ロールでアクセスするため `votes` テーブルへの INSERT RLS ポリシーが適用されず書き込みできない。そのため Route Handler 内では `service_role` クライアントを使用して RLS をバイパスする
- Edge Runtime で実行するため、コールドスタートを考慮した軽量な実装とする（後述）

---

## 5. コードスプリット戦略

### 5.1 ルートベースのコードスプリット（自動）

Next.js App Router がルートごとに自動でコードスプリットする。追加実装は不要。

### 5.2 コンポーネントベースの動的インポート

以下のコンポーネントは `next/dynamic` で遅延読み込みする。

| コンポーネント | 理由 |
|---|---|
| `ShopAddForm`（Google Places を使う部分） | 店舗追加画面のみで使用するため、マイリスト画面の初期JSバンドルから除外 |
| イベント作成フォーム | イベント作成画面のみで使用 |
| 投票フォーム（共有ページ） | 投票フォームは共有ページでのみ使用 |
| リッチテキスト・地図など将来的に重いコンポーネント | 初期バンドルサイズ抑制 |

```typescript
import dynamic from 'next/dynamic'

const ShopAddForm = dynamic(
  () => import('@/components/shop/ShopAddForm'),
  {
    loading: () => <ShopAddFormSkeleton />,
    ssr: false,  // Google Places JS SDK がブラウザ前提のため
  }
)
```

### 5.3 バンドルサイズ目標値

| バンドル | 目標 |
|---|---|
| First Load JS（共有） | ≤100KB（gzip） |
| ページ別 JS | ≤50KB（gzip） |
| 合計 First Load JS | ≤150KB（gzip） |

計測コマンド:

```bash
pnpm run build
# ビルド出力の "First Load JS" 列を確認する
```

### 5.4 Tree Shaking の確認

- `lodash` の代わりに `lodash-es` を使用する（ESM対応でTree Shakingが効く）
- shadcn/ui コンポーネントはソースをプロジェクト内に持つため、未使用コンポーネントはファイルを追加しないことでバンドルに含まれない
- `date-fns` 等のユーティリティは named import で使用し、全体 import を避ける

---

## 6. Supabase クエリ最適化

### 6.1 N+1問題の防止

マイリスト（S-06）でタグを一覧表示する場合、店舗ごとに個別クエリを発行しない。

```typescript
// NG: N+1クエリ
const shops = await db.select().from(shopsTable).where(eq(shopsTable.userId, userId))
for (const shop of shops) {
  const tags = await db.select().from(shopTagsTable).where(eq(shopTagsTable.shopId, shop.id))
}

// OK: JOIN で1クエリに集約
const shopsWithTags = await db
  .select({
    shop: shopsTable,
    tag: tagsTable,
  })
  .from(shopsTable)
  .leftJoin(shopTagsTable, eq(shopTagsTable.shopId, shopsTable.id))
  .leftJoin(tagsTable, eq(tagsTable.id, shopTagsTable.tagId))
  .where(eq(shopsTable.userId, userId))
```

### 6.2 必要なカラムのみ SELECT

一覧画面では全カラムを取得せず、表示に必要なカラムのみを指定する。

```typescript
// マイリスト一覧では photo_url・business_hours 等の大きなフィールドは取得しない
const shops = await db
  .select({
    id: shopsTable.id,
    name: shopsTable.name,
    category: shopsTable.category,
    priceRange: shopsTable.priceRange,
    area: shopsTable.area,
  })
  .from(shopsTable)
  .where(eq(shopsTable.userId, userId))
```

### 6.3 ページネーション

マイリストの店舗件数が増加した場合に備え、LIMIT/OFFSET ベースのページネーションを実装する（v1.0）。

```typescript
const PAGE_SIZE = 20

const shops = await db
  .select({ ... })
  .from(shopsTable)
  .where(eq(shopsTable.userId, userId))
  .limit(PAGE_SIZE)
  .offset(page * PAGE_SIZE)
```

---

## 7. Edge Runtime のコールドスタート対策

### 7.1 Cloudflare Workers の特性

Cloudflare Workers（Edge Runtime）はV8 Isolateを使用しており、従来のNode.jsサーバーと異なる特性がある。

| 特性 | 内容 |
|---|---|
| コールドスタート | 初回リクエストのみ数ms〜数十ms程度（Node.jsの数秒と比べて極めて短い） |
| グローバルキャッシュ | `globalThis` オブジェクトへのキャッシュはIsolate内でのみ有効（リクエスト間で共有されない場合がある） |
| ウォームリクエスト | 同じIsolateに対する2回目以降のリクエストは実質コールドスタートなし |

Cloudflare Workers のコールドスタートは数ms程度であるため、Node.js サーバーのような対策（常駐プロセス等）は不要。

### 7.2 Isolate 内でのコネクション管理

Supabase クライアントは `@supabase/ssr` を使用し、リクエストごとに生成する（Edge Runtime の制約）。
Drizzle ORM のDBクライアントも同様にリクエストスコープで生成する。

`src/db/client.ts` では `createDb()` 関数をエクスポートしており、Route Handler や Server Component 内で**リクエストスコープごとに呼び出す**こと。モジュールのトップレベルで DB クライアントインスタンスを保持することは禁止する（環境変数が読み込まれるタイミングやIsolate間の共有に関する問題が生じるため）。

```typescript
// src/app/api/votes/route.ts（Route Handler での使用例）
import { createDb } from '@/db/client'

export async function POST(request: Request) {
  const db = createDb()  // リクエストスコープで呼び出す
  // ...
}
```

```typescript
// NG: モジュールトップレベルでのインスタンス保持
import { createDb } from '@/db/client'
const db = createDb()  // 禁止

export async function POST(request: Request) {
  // db を使用...
}
```

### 7.3 バンドルサイズの軽量化

Edge Runtime でのコールドスタート時間はバンドルサイズに比例する。
Route Handler のバンドルは軽量に保つ。

- Node.js専用API（`fs`・`crypto`（Node版）等）は使用しない（`crypto.randomUUID()` はWeb Crypto APIを使用）
- 大きなライブラリ（`moment.js` 等）は使用しない

---

## 8. Cloudflare CDN キャッシュ設計

### 8.1 キャッシュ対象と戦略

| リソース種別 | Cache-Control | 理由 |
|---|---|---|
| 静的アセット（JS/CSS/フォント） | `public, max-age=31536000, immutable` | ビルドハッシュ付きファイル名のため永続キャッシュ可 |
| next/image 変換後画像 | `public, max-age=86400` | Cloudflare が自動キャッシュ（24時間） |
| ランディングページ（S-01） | `public, s-maxage=60, stale-while-revalidate=3600` | 認証不要・内容変化が少ない |
| 認証必須ページ（S-06〜） | `private, no-store` | ユーザー固有データのため CDN キャッシュ禁止 |
| 共有ページ（S-12） | `public, s-maxage=10, stale-while-revalidate=60` | ゲストアクセス可・投票結果は短期キャッシュ |
| Route Handler（`/api/*`） | レスポンスごとに個別設定（下記参照） |  |

### 8.2 Route Handler のキャッシュ設定

| エンドポイント | Cache-Control | 理由 |
|---|---|---|
| `GET /api/shops/places` | `private, max-age=60` | 検索結果はユーザーごとに異なる |
| `POST /api/votes` | `no-store` | 書き込み系はキャッシュしない |
| `GET /api/events/[id]/results` | `private, max-age=10` | 投票結果は短期キャッシュ（手動更新ボタン対応） |

### 8.3 Cloudflare Pages の設定

`public/_headers` ファイルで静的アセットのキャッシュヘッダーを制御する。

```
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=86400
```

---

## 9. 実装チェックリスト

以下を各機能の実装時に確認する。

### LCP（PERF-01）

- [ ] Server Components でデータフェッチしている（Client Component での `useEffect` フェッチを避ける）
- [ ] `next/font` でフォントをセルフホスト化している
- [ ] ファーストビューの店舗写真に `priority={true}` を設定している
- [ ] `next/image` の `sizes` が適切に設定されている
- [ ] 重いコンポーネント（Google Places SDK依存）を `next/dynamic` で遅延ロードしている

### 検索レスポンス（PERF-02）

- [ ] 入力デバウンス 300ms を設定している
- [ ] 最小検索文字数 2文字を設定している
- [ ] Route Handler に `Cache-Control: private, max-age=60` を設定している
- [ ] 新規クエリで `EXPLAIN ANALYZE` を実行しインデックスを確認した

### 投票送信（PERF-03）

- [ ] 投票送信後に Optimistic UI で即座にフィードバックを表示している
- [ ] エラー時にフォームを操作可能な状態に戻している
- [ ] `votes` と `vote_choices` のINSERTをトランザクションで一括実行している

### バンドルサイズ

- [ ] `pnpm run build` でバンドルサイズを確認している（First Load JS ≤150KB目標）
- [ ] `next/dynamic` を使用した遅延ロードが正しく機能している
