# 技術スタック

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-26
**ステータス:** Draft

---

## 技術スタック一覧

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| フロントエンド | Next.js（App Router）+ TypeScript | Cloudflare Pages にデプロイ可能；将来のモバイル展開に対応しやすい |
| スタイリング | Tailwind CSS | ブランドカラーのカスタマイズが容易 |
| UIコンポーネント | shadcn/ui | Radix UI ベースで A11Y 要件を満たしやすい；Tailwind との親和性が高く、ソースをプロジェクト内に持つためカスタマイズが自由 |
| フォーム管理 | React Hook Form + Zod | shadcn/ui 公式採用の組み合わせ；Zod スキーマをフロント・Route Handler 両側で共用しサーバーサイドバリデーション（SEC-04）を型安全に実現 |
| サーバー状態管理 | Server Components 中心（追加ライブラリなし） | App Router のデータフェッチ機能で大半のユースケースをカバー；バンドルサイズを抑え LCP 要件（PERF-01）に有利。投票リアルタイム部分は Supabase Realtime を局所的に使用 |
| API / BFF | Next.js Route Handlers（Edge Runtime） | Cloudflare Workers 上で動作；軽量で低レイテンシ |
| データベース | Supabase（PostgreSQL） | RLS によるセキュアなデータ分離；Realtime で投票結果のリアルタイム配信 |
| ORM | Drizzle ORM | Edge Runtime（Cloudflare Workers）対応；型安全なクエリ |
| 認証 | Supabase Auth | メール認証・セッション管理が組み込み済み |
| ファイルストレージ | Supabase Storage | 店舗写真のキャッシュ保存（将来） |
| テスト | Vitest + Testing Library | Vite ベースで高速；TypeScript・Edge Runtime との相性が良い。E2E（Playwright）は Phase 2 以降で追加 |
| Lint / Format | Biome | Rust ベースで高速；Lint と Format を一体管理し設定コストを低減 |
| パッケージマネージャー | pnpm | インストール速度・ディスク効率が高く CI コストを抑制；将来のモノレポ移行にも対応 |
| デプロイ | Cloudflare Pages | グローバルエッジ配信；高速・低コスト |
| CI/CD | GitHub Actions | 自動テスト・Cloudflare Pages へのデプロイ |

---

## 採用しなかった技術

| 技術 | 理由 |
|---|---|
| Prisma | Cloudflare Workers（Edge Runtime）で動作しないため。代替として Drizzle ORM を採用 |
| TanStack Query / SWR | App Router の Server Components で大半のデータフェッチをカバーできるため不要。必要に応じて Phase 2 以降で局所導入を検討 |
| Jest | Vitest と比較してセットアップコストが高く、Edge Runtime との相性も劣るため |
| ESLint + Prettier | Biome で Lint・Format を一体管理できるため、2ツール構成のオーバーヘッドを避けた |
| Playwright（E2E） | MVP フェーズでは開発速度を優先。Phase 2 以降で重要ユーザーシナリオに対して導入予定 |
