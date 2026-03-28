# Tokoco — Claude Code ガイド

## プロジェクト概要

レストランを記録・管理し、グループでの食事イベント調整（候補店舗の共有・投票）を行うWebアプリ。

- **ユーザー種別:** Member（登録済み・全機能利用可）/ Guest（共有リンク経由・投票のみ）
- **デプロイ:** Cloudflare Pages（Edge Runtime）— Node.js専用APIは使用不可

## 重要ドキュメント

- 要件定義: `docs/requirements.md`（機能要件・要件ID: AUTH-xx / SHOP-xx / EVENT-xx / VOTE-xx）
- 技術スタック選定: `docs/basic-design/01_tech-stack.md`
- システムアーキテクチャ: `docs/basic-design/02_architecture.md`
- DB設計・DDL・RLS: `docs/basic-design/04_database.md`
- その他設計書: `docs/basic-design/`（05〜18番、Issueで順次作成中）

## GitHub Issues ワークフロー

### Issue 作成の順序ルール

機能追加・変更は必ずこの順でIssueを立てる:

```
① type: requirements  →  docs/requirements.md を更新
② type: design        →  docs/basic-design/ の該当ファイルを更新
③ type: impl          →  コード実装
```

- 要件変更なしの設計改善は ② から
- バグ修正・chore は ③ から直接

### マイルストーン

| マイルストーン | 内容 |
|---|---|
| M0: Foundation | 設計ドキュメント・インフラ・プロジェクト骨格 |
| M1: Auth + Shop | 認証フロー・店舗CRUD |
| M2: Event + Vote | イベント・投票 |
| M3: Polish + Launch | QA・A11Y・セキュリティ・本番デプロイ |

### 着手前の確認

```bash
gh issue list --milestone "M0: Foundation" --state open
```

### ラベル体系

- `type: requirements / design / impl / infra / bug / test / chore`
- `area: auth / shop / event / vote / infra / design-system`
- `priority: critical / high / medium / low`

## ブランチ命名規則

```
<type>/<issue番号>-<short-kebab-description>

例:
  impl/23-add-shop-places-autocomplete
  design/10-signup-screen-spec
  infra/13-nextjs-init
```

## コミットメッセージ

```
<type>(<area>): <summary> (#<issue番号>)

例:
  feat(shop): implement Google Places text search Route Handler (#22)
  fix(vote): handle closed event in share_token validation (#34)
  docs(design): add API route handler specifications (#2)
```

## PR ルール

- body に `Closes #XX` を記載 → マージ時にIssueが自動クローズ

## PRチェックリスト（実装Issue）

- [ ] Biome lint/format パス（`pnpm biome check`）
- [ ] TypeScript 型エラーなし（`pnpm tsc --noEmit`）
- [ ] Vitest テスト追加・更新済み
- [ ] 新規クエリに Supabase RLS が適用されていることを確認
- [ ] モバイル（375px・390px）でレイアウト確認
- [ ] APIキー・秘密情報がクライアントバンドルに含まれていないことを確認

## Issue 着手時の定型文

新しいセッションでIssueに着手する際は以下の形式で伝えてもらうと効率的:

```
Issue #XX の[設計/実装]を進める。
仕様: #YY（依存Issue）
要件: requirements.md の XXX-01〜XX
ブランチ: impl/XX-xxx
```

## CLAUDE.md が肥大化した場合

200行を超えてきたら `.claude/rules/` に分離する:

```
.claude/rules/
├── db-queries.md          # RLS・Drizzle クエリ規約
├── api-conventions.md     # Route Handler 規約
└── ui-components.md       # コンポーネント設計規約
```

## エージェントの改善方法

エージェントの振る舞いは `.claude/agents/<name>.md` の内容で決まる。
問題に気づいたら以下のフローで改善する:

```
1. GitHub Issue を作成
   ラベル: type: chore + area: agents
   タイトル例: "[pm] 次のアクション出力に依存Issueリンクが含まれない"

2. .claude/agents/<name>.md を編集
   - 問題の原因となっている指示を修正・追記

3. コミット・プッシュ
   git add .claude/agents/<name>.md
   git commit -m "chore(agents): <修正内容> (#<issue番号>)"
   git push

4. 次のセッションから反映される
```

### エージェント一覧

| ファイル | 役割 |
|---|---|
| `.claude/agents/pm.md` | 進捗確認・次のアクション提案・Issue作成 |
| `.claude/agents/dev.md` | 設計書作成・実装・テスト・Git操作 |
| `.claude/agents/reviewer.md` | コード・設計書・テストのレビュー |
