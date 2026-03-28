# ディレクトリ構造

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-27
**ステータス:** Draft

---

## プロジェクト全体構成

```
tokoco/
├── .claude/                       # Claude Code 設定
│   ├── agents/                    # サブエージェント定義
│   │   ├── dev.md
│   │   ├── pm.md
│   │   └── reviewer.md
│   └── settings.local.json
├── .github/                       # GitHub Actions / Issue テンプレート
├── docs/                          # 設計・仕様ドキュメント
│   ├── basic-design/
│   │   ├── 01_tech-stack.md
│   │   ├── 02_architecture.md
│   │   ├── 03_directory-structure.md  ← このファイル
│   │   └── 04_database.md
│   ├── development-flow.md
│   └── requirements.md
├── public/                        # 静的ファイル
├── src/                           # アプリケーションコード
│   ├── app/                       # Next.js App Router
│   ├── components/                # React コンポーネント
│   ├── db/                        # Drizzle ORM
│   ├── lib/                       # ユーティリティ・初期化
│   └── middleware.ts              # 認証ガード
├── .gitignore
├── biome.json                     # Biome lint/format 設定
├── components.json                # shadcn/ui 設定
├── next.config.ts                 # Next.js 設定
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs             # PostCSS（Tailwind CSS v4）
├── tsconfig.json
└── vitest.config.ts               # Vitest 設定
```

---

## src/ 詳細構成

```
src/
├── app/
│   ├── (auth)/                    # 認証不要のルートグループ
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (app)/                     # 認証必須のルートグループ
│   │   ├── layout.tsx             # 認証チェック・ナビゲーション
│   │   ├── shops/
│   │   │   ├── page.tsx           # 店舗一覧
│   │   │   ├── new/
│   │   │   │   └── page.tsx       # 店舗登録
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # 店舗詳細
│   │   │       └── edit/
│   │   │           └── page.tsx   # 店舗編集
│   │   └── events/
│   │       ├── page.tsx           # イベント一覧
│   │       ├── new/
│   │       │   └── page.tsx       # イベント作成
│   │       └── [id]/
│   │           └── page.tsx       # イベント詳細・投票管理
│   ├── api/                       # Route Handlers（Edge Runtime）
│   │   ├── shops/
│   │   │   └── route.ts
│   │   └── votes/
│   │       └── route.ts
│   ├── events/
│   │   └── share/
│   │       └── [token]/
│   │           └── page.tsx       # 公開ルート（ゲスト投票）
│   ├── layout.tsx                 # ルートレイアウト
│   ├── page.tsx                   # トップページ
│   └── globals.css                # グローバルスタイル（Tailwind + shadcn 変数）
├── components/
│   ├── ui/                        # shadcn/ui コンポーネント（自動生成）
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   └── ...
│   ├── auth/                      # 認証関連コンポーネント
│   ├── shop/                      # 店舗関連コンポーネント
│   ├── event/                     # イベント関連コンポーネント
│   └── vote/                      # 投票関連コンポーネント
├── db/
│   ├── schema.ts                  # Drizzle スキーマ定義
│   └── index.ts                   # DB クライアント（Edge Runtime 対応）
├── lib/
│   ├── supabase/
│   │   ├── server.ts              # Server Component / Route Handler 用クライアント
│   │   └── client.ts              # Client Component 用クライアント（Realtime）
│   ├── validations/               # Zod スキーマ（フロント・サーバー共用）
│   │   ├── shop.ts
│   │   ├── event.ts
│   │   └── vote.ts
│   └── utils.ts                   # 汎用ユーティリティ（cn 関数等）
└── middleware.ts                  # 認証ガード（Edge Runtime）
```

---

## ファイル命名規則

| 種類 | 命名規則 | 例 |
|---|---|---|
| Next.js 特殊ファイル | 小文字 | `page.tsx`, `layout.tsx`, `route.ts` |
| React コンポーネント | PascalCase | `ShopCard.tsx`, `VoteForm.tsx` |
| ユーティリティ | camelCase | `utils.ts`, `validators.ts` |
| shadcn/ui コンポーネント | kebab-case | `button.tsx`, `input.tsx` |
| テストファイル | コロケーション | `route.test.ts`（対象ファイルと同ディレクトリ） |

---

## 主要ファイルの役割

### `src/middleware.ts`
Supabase Auth SSR を使った認証ガード。`(app)/` 配下へのアクセスは認証必須。share_token 経由の公開ルートは対象外。

### `src/db/schema.ts`
Drizzle ORM のテーブル定義。`docs/basic-design/04_database.md` と常に同期させること。

### `src/lib/utils.ts`
shadcn/ui が使用する `cn()` 関数（`clsx` + `tailwind-merge`）を提供。

### `src/lib/validations/`
フロントエンド（React Hook Form）とバックエンド（Route Handler）で共有する Zod スキーマ。

### `src/app/globals.css`
Tailwind CSS v4 の設定とshadcn/ui の CSS カスタムプロパティ（カラーシステム）を定義。

---

## Edge Runtime 制約

`src/app/api/` 配下の Route Handlers と `src/middleware.ts` は Cloudflare Pages の Edge Runtime 上で動作する。以下の制約に従うこと:

- `import fs from 'fs'` 等の Node.js 専用 API は使用不可
- `crypto.randomUUID()` 等の Web Crypto API を使用すること
- `import { randomBytes } from 'crypto'` は使用不可
