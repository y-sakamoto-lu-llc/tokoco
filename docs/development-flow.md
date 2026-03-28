# 開発フロー

## エージェント構成

このプロジェクトは Claude Code のサブエージェントを使って開発を進める。

| エージェント | ファイル | 役割 |
|---|---|---|
| **PM** | `.claude/agents/pm.md` | 進捗確認・次のアクション提案・Issue 管理 |
| **dev** | `.claude/agents/dev.md` | 設計書作成・実装・テスト・Git 操作 |
| **reviewer** | `.claude/agents/reviewer.md` | コード・設計書・テストのレビュー |

---

## 1サイクルの流れ

```
① ユーザー → PM
   「次に何をやればいい？」
   → PM が着手可能な Issue を優先順に提示し、dev への指示文を出力する

② ユーザー → dev
   PM の出力をそのまま渡す
   → dev がブランチ作成・設計書作成 or 実装・テスト・PR 作成を行う

③ ユーザー → reviewer
   「PR #XX をレビューして」
   → reviewer が要件・設計との整合性・セキュリティ・テスト充足度を確認し結果を報告する

④ レビュー指摘がある場合
   ユーザー → dev にフィードバックを渡す
   → dev が修正・追加コミットを行う
   → ③ に戻る

⑤ レビュー承認
   ユーザーが PR をマージ

⑥ ユーザー → PM
   「#XX が完了しました」
   → PM が次の着手可能 Issue を提示する
```

---

## GitHub Issues ワークフロー

### Issue 作成の順序ルール

機能追加・変更は必ずこの順序で Issue を作成する:

```
① type: requirements  →  docs/requirements.md を更新
② type: design        →  docs/basic-design/ の該当ファイルを作成・更新
③ type: impl          →  コード実装
```

- 要件変更なしの設計改善は ② から開始
- バグ修正・chore は ③ から直接

### マイルストーン

| マイルストーン | 内容 |
|---|---|
| M0: Foundation | 設計ドキュメント・インフラ・プロジェクト骨格 |
| M1: Auth + Shop | 認証フロー・店舗 CRUD |
| M2: Event + Vote | イベント・投票 |
| M3: Polish + Launch | QA・A11Y・セキュリティ・本番デプロイ |

### ラベル体系

- **タイプ**: `type: requirements / design / impl / infra / bug / test / chore`
- **エリア**: `area: auth / shop / event / vote / infra / design-system / agents`
- **優先度**: `priority: critical / high / medium / low`

---

## ブランチ・コミット・PR 規約

### ブランチ命名

```
<type>/<issue番号>-<short-kebab-description>

例:
  impl/23-add-shop-places-autocomplete
  design/10-signup-screen-spec
  infra/13-nextjs-init
```

### コミットメッセージ

```
<type>(<area>): <summary> (#<issue番号>)

例:
  feat(shop): implement Google Places text search Route Handler (#22)
  docs(design): add API route handler specifications (#2)
  fix(vote): handle closed event in share_token validation (#34)
```

### PR ルール

- body に `Closes #XX` を記載 → マージ時に Issue が自動クローズ

---

## PR チェックリスト（実装 Issue）

マージ前に以下をすべて確認する:

- [ ] Biome lint/format パス（`pnpm biome check`）
- [ ] TypeScript 型エラーなし（`pnpm tsc --noEmit`）
- [ ] Vitest テスト追加・更新済み（`pnpm test`）
- [ ] 新規クエリに Supabase RLS が適用されていることを確認
- [ ] モバイル（375px・390px）でレイアウト確認
- [ ] API キー・秘密情報がクライアントバンドルに含まれていないことを確認

---

## エージェントの改善方法

エージェントの振る舞いに問題があった場合:

1. GitHub Issue を作成（`type: chore` + `area: agents`）
2. `.claude/agents/<name>.md` を編集
3. コミット・プッシュ（次のセッションから即反映）

```
git add .claude/agents/<name>.md
git commit -m "chore(agents): <修正内容> (#<issue番号>)"
git push
```
