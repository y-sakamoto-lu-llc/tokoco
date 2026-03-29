# 環境変数設定

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-29
**ステータス:** Draft

---

## 環境変数一覧

| 変数名 | NEXT_PUBLIC_ | 用途 | ローカル値 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | あり | Supabase API エンドポイント（クライアント・サーバー共用） | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | あり | Supabase anon キー（RLS が適用される） | `supabase start` で確認 |
| `SUPABASE_SERVICE_ROLE_KEY` | なし | Supabase service_role キー（RLS をバイパス。Route Handler 専用） | `supabase start` で確認 |
| `DATABASE_URL` | なし | PostgreSQL 接続URL（Drizzle ORM マイグレーション用） | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `NEXT_PUBLIC_SITE_URL` | あり | サイトのベースURL（ゲスト共有リンク生成・OAuth コールバック） | `http://localhost:3000` |
| `GOOGLE_PLACES_API_KEY` | なし | Google Places API キー（店舗検索 Route Handler 専用） | Google Cloud Console で発行 |

### セキュリティ原則

- `NEXT_PUBLIC_` プレフィックスの変数はブラウザのバンドルに含まれる。秘密情報を持つ変数には絶対に付与しない。
- `SUPABASE_SERVICE_ROLE_KEY` と `GOOGLE_PLACES_API_KEY` は Route Handler 内からのみ使用する。Server Component や Client Component で import してはならない。
- `SUPABASE_SERVICE_ROLE_KEY` を使うクライアントは `src/lib/supabase/admin.ts` の `createSupabaseAdminClient()` 経由でのみ生成する。

---

## ローカル開発セットアップ

### 1. `.env.local` を作成する

```bash
cp .env.local.example .env.local
```

### 2. Supabase ローカル環境を起動する

```bash
pnpm supabase start
```

起動後に表示される以下の値を `.env.local` に貼り付ける:

```
API URL: http://127.0.0.1:54321  → NEXT_PUBLIC_SUPABASE_URL
anon key: eyJ...                 → NEXT_PUBLIC_SUPABASE_ANON_KEY
service_role key: eyJ...         → SUPABASE_SERVICE_ROLE_KEY
DB URL: postgresql://...         → DATABASE_URL
```

### 3. Google Places API キーを取得する（店舗検索機能が必要な場合）

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスする
2. プロジェクトを選択し「APIとサービス」→「ライブラリ」を開く
3. 「Places API（New）」を検索して有効化する
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「APIキー」を選択する
5. APIキーの制限: HTTP リファラーまたは IP アドレスを設定して不正利用を防ぐ
6. 発行したキーを `.env.local` の `GOOGLE_PLACES_API_KEY` に設定する

### 4. 動作確認

```bash
pnpm dev
# http://localhost:3000 にアクセスして起動を確認
```

---

## 本番・ステージング環境への設定

### GitHub Actions Secrets

以下の変数を `Settings > Secrets and variables > Actions` に登録する:

| Secret 名 | 説明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 本番 Supabase プロジェクトの API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 本番 Supabase anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | 本番 Supabase service_role キー |
| `DATABASE_URL` | 本番 PostgreSQL 接続URL（マイグレーション実行時に使用） |

### Cloudflare Pages 環境変数

Cloudflare Pages の `Settings > Environment variables` に以下を設定する:

| 変数名 | 環境 | 説明 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production / Preview | 本番 Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production / Preview | 本番 Supabase anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Production / Preview | 本番 Supabase service_role キー（暗号化して保存） |
| `DATABASE_URL` | Production / Preview | 本番 DB 接続URL（暗号化して保存） |
| `NEXT_PUBLIC_SITE_URL` | Production | 本番サイトURL（例: `https://tokoco.pages.dev`） |
| `NEXT_PUBLIC_SITE_URL` | Preview | Preview 用 URL（例: `https://preview.tokoco.pages.dev`） |
| `GOOGLE_PLACES_API_KEY` | Production / Preview | Google Places API キー（暗号化して保存） |

---

## 各変数の使用箇所

| 変数名 | 使用ファイル | 用途 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts` | Supabase クライアント初期化 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` | Supabase 認証済みクライアント（RLS 適用） |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts` | Supabase admin クライアント（Route Handler のみ） |
| `DATABASE_URL` | `drizzle.config.ts`, `src/db/client.ts` | Drizzle Kit マイグレーション・DB クライアント初期化 |
| `NEXT_PUBLIC_SITE_URL` | ゲスト共有リンク生成ロジック（実装予定） | `https://<site>/events/share/<token>` の生成 |
| `GOOGLE_PLACES_API_KEY` | 店舗検索 Route Handler（実装予定） | Google Places Text Search API 呼び出し |
