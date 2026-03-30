# Google Places API 統合設計

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-29
**ステータス:** Draft

---

## 目次

1. [概要](#1-概要)
2. [利用エンドポイントと選定理由](#2-利用エンドポイントと選定理由)
3. [Route Handler プロキシ設計](#3-route-handler-プロキシ設計)
4. [取得フィールド一覧](#4-取得フィールド一覧)
5. [APIレスポンス → DBスキーマ フィールドマッピング](#5-apiレスポンス--dbスキーマ-フィールドマッピング)
6. [Google Maps URL パース設計](#6-google-maps-url-パース設計)
7. [店舗登録フロー](#7-店舗登録フロー)
8. [エラーハンドリング](#8-エラーハンドリング)
9. [キャッシュ戦略](#9-キャッシュ戦略)
10. [レートリミット対策](#10-レートリミット対策)
11. [環境変数管理](#11-環境変数管理)

---

## 1. 概要

Tokoco では店舗情報の自動補完に Google Places API（New）を使用する。
ブラウザから Google API を直接呼び出すことはなく、すべて Route Handler 経由でプロキシする。
これにより APIキーをサーバーサイドのみで管理できる（SHOP-02 / SEC 要件）。

### 本設計書と 05_api-route-handlers.md の関係

本設計書（`12_google-places-integration.md`）は `05_api-route-handlers.md` の Google Places 関連セクションを**詳細化・上書き**するものである。
特に `/api/shops/places/from-url` のパース方針（多段階フォールバック戦略）は `05_api-route-handlers.md` より詳細に定義しており、**本設計書を参照優先**とする。
実装時は本設計書の仕様に従うこと。

### 関連要件

| 要件ID | 内容 |
|---|---|
| SHOP-02 | 店名入力時: Google Places API で候補を検索・選択し、店舗情報を自動補完する |
| SHOP-03 | URL入力時: Google マップ URL から Place ID を抽出し店舗情報を取得する |
| SHOP-04 | 自動補完される情報: 店名・住所・エリア・電話番号・カテゴリ・価格帯・評価・営業時間・公式サイトURL・Google マップURL・写真 |
| SHOP-05 | 自動補完に失敗した場合は手動入力モードで店名のみ登録できる |
| PERF-02 | 店舗検索の候補表示は入力から1秒以内に応答する |
| SEC-08 | API キーはサーバーサイドのみで保持し、クライアントに露出しない |

---

## 2. 利用エンドポイントと選定理由

Google Places API（New）の以下の2つを使用する。

### 2.1 Text Search（New）

```
POST https://places.googleapis.com/v1/places:searchText
```

**用途:** 店名キーワードから候補リストを表示（SHOP-02）

**選定理由:**
- キーワードによる柔軟な自然言語検索が可能
- レスポンスにフィールドマスクを指定でき、必要フィールドのみ取得してコストを最小化できる（Autocomplete より詳細情報を一度に取得可能）
- Places API（New）は Places API（Legacy）より費用効率が高い（Field Masking）

**代替案として検討した Autocomplete（New）との比較:**

| 項目 | Text Search（New） | Autocomplete（New） |
|---|---|---|
| 用途 | キーワード検索・上位件数返却 | 入力補完（タイプ中のサジェスト） |
| 価格 | $32.50/1000リクエスト（Basic Data） | $2.83/1000セッション |
| 1回の取得情報 | 指定フィールドすべて | IDと名称のみ（Details別途） |
| 採用理由 | フォーム送信後に一度だけ呼ぶ用途に最適 | タイピングのたびに呼ぶ用途に最適 |

Tokoco の店舗追加フローは「店名入力 → 検索ボタン押下 → 候補選択」であり、タイピング中の逐次呼び出しではない。
そのため Text Search を採用し、入力確定後に1回のみ呼び出す設計とする。

### 2.2 Place Details（New）

```
GET https://places.googleapis.com/v1/places/{placeId}
```

**用途:** placeId から詳細情報をすべて取得（SHOP-04）。候補選択後および URL 入力時に使用する。

**選定理由:**
- フィールドマスクで取得カテゴリ（Basic / Advanced / Preferred）を細かく指定できる
- Text Search で返却される情報より詳細な情報（営業時間・写真など）を取得できる

---

## 3. Route Handler プロキシ設計

### アーキテクチャ

```
ブラウザ（Client Component）
  │
  │ GET /api/shops/places/search?q=<キーワード>
  │ GET /api/shops/places/details?placeId=<ID>
  │ GET /api/shops/places/from-url?url=<URL>
  │
  ▼
Route Handler（Edge Runtime）
  │ GOOGLE_PLACES_API_KEY（Cloudflare 環境変数）を付与
  │ フィールドマスク（X-Goog-FieldMask）を設定
  ▼
Google Places API（New）
```

- Supabase JWT による認証必須（ゲストからは呼び出せない）
- レスポンスは Route Handler 内でキャッシュ（後述）

### Route Handler 一覧（05_api-route-handlers.md より）

| エンドポイント | 内部で呼ぶ Google API | 概要 |
|---|---|---|
| `GET /api/shops/places/search` | Text Search（New） | キーワード検索・最大10件の候補を返す |
| `GET /api/shops/places/details` | Place Details（New） | placeId から詳細情報を取得 |
| `GET /api/shops/places/from-url` | Place Details（New） | Google マップ URL から placeId を抽出して詳細取得 |

---

## 4. 取得フィールド一覧

Google Places API（New）のフィールドマスクで指定するフィールドを記載する。
フィールドは費用カテゴリ別に管理し、不要なフィールドは指定しない。

### 4.1 Text Search 用フィールドマスク

```
X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.types,places.priceLevel,places.rating,places.photos
```

| Google フィールド | 費用カテゴリ | 用途 |
|---|---|---|
| `places.id` | Basic | placeId（候補選択後に Details を取得するための ID） |
| `places.displayName` | Basic | 候補一覧に表示する店名 |
| `places.formattedAddress` | Basic | 候補一覧に表示する住所 |
| `places.types` | Basic | カテゴリの推定に使用 |
| `places.priceLevel` | Basic | 候補一覧での価格帯の参考表示 |
| `places.rating` | Basic | 候補一覧での評価の参考表示 |
| `places.photos` | Basic | 候補一覧のサムネイル（最大1件） |

### 4.2 Place Details 用フィールドマスク

```
X-Goog-FieldMask: id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,types,priceLevel,rating,regularOpeningHours,websiteUri,googleMapsUri,photos
```

| Google フィールド | 費用カテゴリ | マッピング先（DB） |
|---|---|---|
| `id` | Basic | `shops.google_place_id`（参考保持） |
| `displayName.text` | Basic | `shops.name` |
| `formattedAddress` | Basic | `shops.address` |
| `addressComponents` | Basic | `shops.area`（都道府県・市区町村の抽出に使用） |
| `nationalPhoneNumber` | Basic | `shops.phone` |
| `types` | Basic | `shops.category`（マッピングルール後述） |
| `priceLevel` | Basic | `shops.price_range`（変換表後述） |
| `rating` | Basic | `shops.external_rating` |
| `regularOpeningHours.weekdayDescriptions` | Advanced | `shops.business_hours` |
| `websiteUri` | Basic | `shops.website_url` |
| `googleMapsUri` | Basic | `shops.google_maps_url` |
| `photos` | Basic | `shops.photo_url`（最大1件の Photo Reference から URL 生成） |

**費用カテゴリについて:**
- **Basic**: $17/1000リクエスト
- **Advanced**: $32.50/1000リクエスト（`regularOpeningHours` が含まれるため Advanced 扱い）

`regularOpeningHours` は Advanced フィールドのため費用が上がるが、店舗登録時の1回のみ呼ぶ設計であり許容する。

---

## 5. APIレスポンス → DBスキーマ フィールドマッピング

### 5.1 price_level → price_range 変換表

Google の `priceLevel` 列挙値を Tokoco の `price_range` 文字列に変換する。
変換は Route Handler 内で行い、クライアントには変換後の文字列のみ返す。

| Google priceLevel | Tokoco price_range | 説明 |
|---|---|---|
| `PRICE_LEVEL_FREE` (0) | `〜¥999` | 無料または〜999円 |
| `PRICE_LEVEL_INEXPENSIVE` (1) | `¥1,000〜¥2,999` | 安価 |
| `PRICE_LEVEL_MODERATE` (2) | `¥3,000〜¥5,999` | 中程度 |
| `PRICE_LEVEL_EXPENSIVE` (3) | `¥6,000〜¥9,999` | 高め |
| `PRICE_LEVEL_VERY_EXPENSIVE` (4) | `¥10,000〜` | 高級 |
| 未指定・不明 | `'価格帯不明'` | DB に `'価格帯不明'` を保存（`docs/requirements.md` 7.1 / CHECK 制約に準拠） |

```typescript
// src/lib/places/price-level.ts
const PRICE_LEVEL_MAP: Record<string, string> = {
  PRICE_LEVEL_FREE: '〜¥999',
  PRICE_LEVEL_INEXPENSIVE: '¥1,000〜¥2,999',
  PRICE_LEVEL_MODERATE: '¥3,000〜¥5,999',
  PRICE_LEVEL_EXPENSIVE: '¥6,000〜¥9,999',
  PRICE_LEVEL_VERY_EXPENSIVE: '¥10,000〜',
}

export function convertPriceLevel(priceLevel: string | undefined): string {
  if (!priceLevel) return '価格帯不明'
  return PRICE_LEVEL_MAP[priceLevel] ?? '価格帯不明'
}
```

### 5.2 types → category マッピングルール

Google Places の `types` 配列から Tokoco の `category` 文字列を1つ決定する。
優先度順に上から最初にマッチしたカテゴリを使用する。

| Google types（部分一致でマッチ） | Tokoco category |
|---|---|
| `japanese_restaurant` | `和食` |
| `sushi_restaurant` | `寿司` |
| `ramen_restaurant` | `ラーメン` |
| `chinese_restaurant` | `中華` |
| `korean_restaurant` | `韓国料理` |
| `italian_restaurant` | `イタリアン` |
| `french_restaurant` | `フレンチ` |
| `pizza_restaurant` | `ピザ` |
| `hamburger_restaurant` | `バーガー` |
| `steak_house` | `ステーキ` |
| `seafood_restaurant` | `海鮮` |
| `vegetarian_restaurant` | `ベジタリアン` |
| `cafe` または `coffee_shop` | `カフェ` |
| `bar` または `izakaya_restaurant` | `バー・居酒屋` |
| `bakery` | `ベーカリー` |
| `fast_food_restaurant` | `ファストフード` |
| `restaurant` | `レストラン` |
| 上記にマッチしない場合 | `null` |

```typescript
// src/lib/places/category.ts
const CATEGORY_MAP: { pattern: string; category: string }[] = [
  { pattern: 'japanese_restaurant', category: '和食' },
  { pattern: 'sushi_restaurant', category: '寿司' },
  { pattern: 'ramen_restaurant', category: 'ラーメン' },
  { pattern: 'chinese_restaurant', category: '中華' },
  { pattern: 'korean_restaurant', category: '韓国料理' },
  { pattern: 'italian_restaurant', category: 'イタリアン' },
  { pattern: 'french_restaurant', category: 'フレンチ' },
  { pattern: 'pizza_restaurant', category: 'ピザ' },
  { pattern: 'hamburger_restaurant', category: 'バーガー' },
  { pattern: 'steak_house', category: 'ステーキ' },
  { pattern: 'seafood_restaurant', category: '海鮮' },
  { pattern: 'vegetarian_restaurant', category: 'ベジタリアン' },
  { pattern: 'cafe', category: 'カフェ' },
  { pattern: 'coffee_shop', category: 'カフェ' },
  { pattern: 'bar', category: 'バー・居酒屋' },
  { pattern: 'izakaya_restaurant', category: 'バー・居酒屋' },
  { pattern: 'bakery', category: 'ベーカリー' },
  { pattern: 'fast_food_restaurant', category: 'ファストフード' },
  { pattern: 'restaurant', category: 'レストラン' },
]

export function convertTypes(types: string[] | undefined): string | null {
  if (!types?.length) return null
  for (const { pattern, category } of CATEGORY_MAP) {
    if (types.includes(pattern)) return category
  }
  return null
}
```

### 5.3 area（エリア）の抽出

`addressComponents` から `administrative_area_level_1`（都道府県）と `locality`（市区町村）を組み合わせてエリア文字列を生成する。

```typescript
// src/lib/places/area.ts
type AddressComponent = {
  longText: string
  types: string[]
}

export function extractArea(components: AddressComponent[]): string | null {
  const prefecture = components.find(c => c.types.includes('administrative_area_level_1'))?.longText
  const city = components.find(c => c.types.includes('locality'))?.longText
  if (!prefecture) return null
  return city ? `${prefecture}${city}` : prefecture
}
```

### 5.4 photo_url の生成

Place Details レスポンスの `photos[0].name` を使い、以下の形式で写真 URL を生成する。

```
https://places.googleapis.com/v1/{photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key={API_KEY}
```

- 写真は `photos` の先頭1件のみ取得する
- `maxHeightPx=400&maxWidthPx=400` でサイズを制限し帯域を節約する
- API キーが URL に含まれるため、この URL はクライアントに直接返さない
- Route Handler でリダイレクト（302）するか、サーバー側でプロキシして公開 URL を返す

**実装方針:** v1.0では写真 URL の生成は Route Handler でプロキシせず、生成した URL をそのまま DB に保存する（`shops.photo_url`）。表示時は `<img>` で直接参照する。API キーが URL に含まれる問題は v2.0 で対処する。

### 5.5 business_hours の変換

`regularOpeningHours.weekdayDescriptions` は曜日別の営業時間文字列の配列（例: `["月曜日: 11:00–23:00", ...]`）であり、これを改行区切りの文字列に変換して DB に保存する。

```typescript
export function convertBusinessHours(weekdayDescriptions: string[] | undefined): string | null {
  if (!weekdayDescriptions?.length) return null
  return weekdayDescriptions.join('\n')
}
```

---

## 6. Google Maps URL パース設計

SHOP-03 に対応する URL → Place ID の抽出ロジック。

### 対応 URL パターン

Google マップの URL には複数の形式がある。以下のすべてに対応する。

| パターン | URL 例 | 抽出方法 |
|---|---|---|
| 標準マップ URL（place 形式） | `https://www.google.com/maps/place/<name>/<coordinates>/<hash>` | URL の `data=` パラメータ内の `0x...` Hex ID または別途 Text Search |
| Place ID 直接指定 | `https://maps.google.com/?cid=<cid>` | CID から Place ID への変換（非対応） |
| Short URL | `https://goo.gl/maps/...` | リダイレクトを追跡して展開 |
| Share URL | `https://maps.app.goo.gl/...` | リダイレクトを追跡して展開 |
| ローカル URL（`/maps/place/`） | `https://www.google.com/maps/place/<name>/` | name 部分を使って Text Search にフォールバック |

### 抽出ロジック（優先順位）

```
1. URL 内に `place_id=ChI...` パラメータがあれば直接取得
2. URL 内に `/maps/place/<name>/` パターンがあれば name をデコードして Text Search にフォールバック
3. Short URL（goo.gl / maps.app.goo.gl）は fetch で follow redirect してから 1・2 を適用
4. いずれも失敗した場合は 422 を返す
```

```typescript
// src/lib/places/parse-maps-url.ts

export async function extractPlaceIdFromUrl(
  url: string,
  _depth = 0,  // Short URL 展開の再帰は最大1回まで
): Promise<{ placeId: string } | { keyword: string } | null> {
  const parsedUrl = new URL(url)

  // パターン1: place_id クエリパラメータ
  const placeId = parsedUrl.searchParams.get('place_id')
  if (placeId) return { placeId }

  // パターン2: /maps/place/<name>/ から name を抽出
  const placeMatch = parsedUrl.pathname.match(/\/maps\/place\/([^/]+)/)
  if (placeMatch) {
    const keyword = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    return { keyword }
  }

  // パターン3: Short URL の展開（Edge Runtime で fetch を使用・再帰は最大1回）
  if (_depth === 0 && (url.includes('goo.gl') || url.includes('maps.app.goo.gl'))) {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    return extractPlaceIdFromUrl(response.url, 1)
  }

  return null
}
```

**注意:** Short URL 展開のための `fetch` は Edge Runtime でも動作する。Node.js の `http` モジュールは使用しない。

---

## 7. 店舗登録フロー

### 7.1 店名入力フロー（SHOP-02）

```
1. ユーザーが店舗追加画面で店名を入力し「検索」ボタンを押す
2. クライアント → GET /api/shops/places/search?q=<入力値>
3. Route Handler → Google Text Search API（最大10件）
4. クライアントに候補リスト（placeId・店名・住所・カテゴリ・評価・サムネイル）を返す
5. ユーザーが候補を選択する
6. クライアント → GET /api/shops/places/details?placeId=<選択した ID>
7. Route Handler → Google Place Details API（全フィールド）
8. クライアントにフォーム自動入力用の詳細データを返す
9. ユーザーが内容を確認・任意編集して「保存」ボタンを押す
10. クライアント → POST /api/shops（詳細データ + メモ + タグ）
11. DB に保存完了
```

**UX 要件（SHOP-02 / UX-02）:** 店名/URL入力 → 候補選択 → 保存の3ステップで完了。

### 7.2 URL 入力フロー（SHOP-03）

```
1. ユーザーが Google マップ URL を入力欄に貼り付ける（URL 形式を自動検出）
2. クライアント → GET /api/shops/places/from-url?url=<URL>
3. Route Handler が URL から placeId を抽出
   - 直接抽出できた場合 → Place Details API を呼び出す
   - キーワード抽出のみ → Text Search → 上位1件で Place Details API
   - 抽出失敗 → 422 を返す
4. クライアントにフォーム自動入力用の詳細データを返す（7.1 の ステップ8 以降と同じ）
```

### 7.3 手動入力フォールバック（SHOP-05）

以下のいずれかの場合、自動入力をスキップして手動入力モードに切り替える。

| 条件 | Route Handler のレスポンス |
|---|---|
| Text Search で候補が0件 | 200 + `{ candidates: [] }` |
| 候補を選択しなかった（ユーザーが「手動で入力」を選択） | クライアント側の判断 |
| from-url で Place ID が抽出できない | 422 |
| Google API がエラーを返した | 503（後述） |

手動入力モードでは店名のみが必須。その他フィールドはすべて任意入力。

---

## 8. エラーハンドリング

### Route Handler が返す HTTP ステータス

| 状況 | ステータス | レスポンス例 |
|---|---|---|
| `q` パラメータが空 | 400 | `{ "error": "検索キーワードを入力してください" }` |
| `placeId` パラメータが空 | 400 | `{ "error": "placeId は必須です" }` |
| `url` パラメータが Google マップ URL でない | 400 | `{ "error": "Google マップの URL を入力してください" }` |
| URL から Place ID を抽出できない | 422 | `{ "error": "URLから店舗情報を取得できませんでした" }` |
| Google API から ZERO_RESULTS | 200 | `{ "candidates": [] }` （エラーではなく空リスト） |
| Google API から REQUEST_DENIED（キー不正） | 500 | `{ "error": "内部エラーが発生しました" }` （APIキーをクライアントに露出しない） |
| Google API からタイムアウト（3秒） | 503 | `{ "error": "店舗情報の取得に失敗しました。手動で入力してください" }` |
| Google API からレートリミット（429） | 503 | `{ "error": "店舗情報の取得に失敗しました。しばらく後にお試しください" }` |
| JWT 認証失敗 | 401 | `{ "error": "ログインが必要です" }` |

### タイムアウト設定

Google Places API へのリクエストには3秒のタイムアウトを設定する。

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 3000)

try {
  const response = await fetch(googleApiUrl, { signal: controller.signal })
  // ...
} catch (e) {
  if (e instanceof Error && e.name === 'AbortError') {
    return Response.json({ error: '...' }, { status: 503 })
  }
  throw e
} finally {
  clearTimeout(timeoutId)
}
```

**注意:** `AbortController` は Web API であり Edge Runtime（Cloudflare Workers）で動作する。

---

## 9. キャッシュ戦略

### 9.1 Text Search のキャッシュ

同一キーワードに対するリクエストが短時間に繰り返される場合のコスト抑制。

**実装方針:** Next.js の `fetch` 組み込みキャッシュを使用する。

```typescript
// v2.0用・参考（v1.0 はキャッシュなし。Cloudflare Pages 上での動作未確認のため）
const response = await fetch(googleApiUrl, {
  method: 'POST',
  // Next.js の fetch 拡張でキャッシュ設定
  next: { revalidate: 60 },  // 60秒間キャッシュ
})
```

ただし Cloudflare Pages 上では Next.js の `fetch` キャッシュが完全には動作しない可能性があるため、v1.0 はキャッシュなし（毎回 Google API を呼ぶ）で実装し、コスト監視後に必要であれば KV を使ったキャッシュを追加する。

### 9.2 Place Details のキャッシュ

Place Details は placeId が同一であれば結果が変わりにくい。しかし DBに保存されるのは1度だけであり、重複リクエストは少ないと想定されるため v1.0 ではキャッシュしない。

### 9.3 まとめ

| エンドポイント | キャッシュ | 理由 |
|---|---|---|
| `/api/shops/places/search` | v1.0 ではなし、v2.0 で KV 検討 | Cloudflare Pages 制約・コスト監視後判断 |
| `/api/shops/places/details` | なし | 呼び出し頻度が低い |
| `/api/shops/places/from-url` | なし | URL の多様性が高く効果が低い |

---

## 10. レートリミット対策

`05_api-route-handlers.md` の設計に基づき、以下のレートリミットを適用する。

| エンドポイント | 上限 | 理由 |
|---|---|---|
| `GET /api/shops/places/search` | 30回/分/IP | Google Places API のコスト抑制（PERF-02） |
| `GET /api/shops/places/details` | 60回/分/IP | 候補選択ごとに1回、通常操作での超過は考えにくい |
| `GET /api/shops/places/from-url` | 30回/分/IP | search と同様の理由 |

**実装:** Cloudflare Workers 組み込みのレートリミット機能（`Rate limiting API`）を使用する。Next.js ミドルウェアや独自実装は使用しない。

---

## 11. 環境変数管理

### 必要な環境変数

| 変数名 | 説明 | 配置場所 |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | Google Places API キー | Cloudflare Pages の環境変数（本番・ステージング） |

**ローカル開発:** `.env.local` に設定する。`.env.local` は `.gitignore` に含まれており、リポジトリにコミットしない。

```bash
# .env.local
GOOGLE_PLACES_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Cloudflare Pages の設定手順:**
1. Cloudflare ダッシュボード → Pages プロジェクト → Settings → Environment variables
2. 本番・プレビュー両方に `GOOGLE_PLACES_API_KEY` を追加

**クライアントへの露出防止:**
- `GOOGLE_PLACES_API_KEY` は `NEXT_PUBLIC_` プレフィックスを**付けない**
- クライアントバンドルに含まれないことを `pnpm build` 後のバンドル解析で確認する

### APIキーの権限設定（Google Cloud Console）

セキュリティのため、APIキーには以下の制限を設定する。

| 設定項目 | 設定値 |
|---|---|
| API の制限 | Places API のみ有効化 |
| アプリケーションの制限 | HTTP リファラー（Cloudflare Pages のドメイン）または IP アドレス制限 |

---

## 付録: 参考資料

- [Google Places API（New）Text Search ドキュメント](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Google Places API（New）Place Details ドキュメント](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Google Places API（New）料金表](https://mapsplatform.google.com/pricing/)
- [フィールドマスクの指定方法](https://developers.google.com/maps/documentation/places/web-service/choose-fields)
