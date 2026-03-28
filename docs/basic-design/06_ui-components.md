# UIコンポーネント設計

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-29
**ステータス:** Draft

---

## 目次

1. [shadcn/ui 採用コンポーネント一覧](#1-shadcnui-採用コンポーネント一覧)
2. [カスタムコンポーネント一覧](#2-カスタムコンポーネント一覧)
3. [フォームコンポーネントパターン](#3-フォームコンポーネントパターン)
4. [店舗カード（SHOP-15）](#4-店舗カードshop-15)
5. [フィルタ・ソートUI（SHOP-16・SHOP-17）](#5-フィルタソートuishop-16shop-17)
6. [タグ入力コンポーネント（SHOP-07〜SHOP-12）](#6-タグ入力コンポーネントshop-07shop-12)
7. [投票UIコンポーネント（VOTE-02）](#7-投票uiコンポーネントvote-02)
8. [リアルタイム投票結果表示（VOTE-04・VOTE-05）](#8-リアルタイム投票結果表示vote-04vote-05)
9. [トースト・通知パターン](#9-トースト通知パターン)
10. [スケルトンローダー戦略（PERF-01）](#10-スケルトンローダー戦略perf-01)
11. [A11Y 実装パターン（A11Y-01〜A11Y-03）](#11-a11y-実装パターンa11y-01a11y-03)
12. [レスポンシブ設計（UX-01）](#12-レスポンシブ設計ux-01)

---

## 1. shadcn/ui 採用コンポーネント一覧

shadcn/ui はソースをプロジェクト内に持つ設計のため、必要なコンポーネントのみを追加する。
`pnpm dlx shadcn@latest add <name>` で個別追加する。

| コンポーネント | shadcn名 | 用途 | 対応要件 |
|---|---|---|---|
| Button | `button` | 全画面のCTA・操作ボタン | UX-02 |
| Input | `input` | テキスト入力フィールド | A11Y-02 |
| Label | `label` | フォームラベル | A11Y-02 |
| Form | `form` | React Hook Form 統合ラッパー | SEC-04 |
| Card | `card` | 店舗カード・イベントカード | SHOP-15 |
| Badge | `badge` | タグ表示・カテゴリラベル | SHOP-15 |
| Dialog | `dialog` | 削除確認ダイアログ | SHOP-21, AUTH-14 |
| Select | `select` | フィルタ・ソートのドロップダウン | SHOP-16, SHOP-17 |
| Textarea | `textarea` | メモ入力 | SHOP-06 |
| Separator | `separator` | セクション区切り | — |
| Skeleton | `skeleton` | ローディング状態の骨格表示 | PERF-01 |
| Toaster / Sonner | `sonner` | トースト通知 | 操作フィードバック全般 |
| Sheet | `sheet` | モバイルのフィルタパネル（ボトムシート） | SHOP-16, UX-01 |
| Command | `command` | タグ入力のコンボボックス（サジェスト付き） | SHOP-08 |
| Popover | `popover` | タグ入力のドロップダウン（Command と組み合わせ） | SHOP-08 |
| Checkbox | `checkbox` | 投票の複数選択・候補店舗選択 | VOTE-02 |
| Progress | `progress` | 投票結果バー | VOTE-05 |
| Avatar | `avatar` | 将来的なユーザーアバター表示 | — |
| Alert | `alert` | エラーメッセージ・警告表示 | SEC-04 |
| Tabs | `tabs` | イベント一覧のオープン中／クローズ済み切り替え | EVENT-11b |

---

## 2. カスタムコンポーネント一覧

shadcn/ui に存在しない、または機能的に大きく拡張が必要なコンポーネントはカスタムコンポーネントとして実装する。
配置先: `src/components/<feature>/`

| コンポーネント名 | ファイルパス | 概要 | 対応要件 |
|---|---|---|---|
| `ShopCard` | `src/components/shop/ShopCard.tsx` | 店舗一覧のカード。店名・カテゴリ・価格帯・タグを表示 | SHOP-15 |
| `ShopCardSkeleton` | `src/components/shop/ShopCardSkeleton.tsx` | ShopCard のスケルトンローダー | PERF-01 |
| `TagInput` | `src/components/shop/TagInput.tsx` | サジェスト付きタグ入力（Command + Popover 組み合わせ） | SHOP-07〜12 |
| `TagBadge` | `src/components/shop/TagBadge.tsx` | 削除ボタン付きタグバッジ | SHOP-10 |
| `ShopFilterBar` | `src/components/shop/ShopFilterBar.tsx` | デスクトップ用フィルタ横並びバー | SHOP-16, SHOP-17 |
| `ShopFilterSheet` | `src/components/shop/ShopFilterSheet.tsx` | モバイル用フィルタボトムシート（Sheet 利用） | SHOP-16, UX-01 |
| `VoteShopItem` | `src/components/vote/VoteShopItem.tsx` | 投票画面の候補店舗選択アイテム（Checkbox + 店舗情報） | VOTE-02 |
| `VoteResultBar` | `src/components/vote/VoteResultBar.tsx` | 投票結果の得票数バー（Progress + 得票数・最多ハイライト） | VOTE-05 |
| `VoteResultList` | `src/components/vote/VoteResultList.tsx` | 投票結果の一覧（VoteResultBar の集合体） | VOTE-04, VOTE-05 |
| `ShareLinkBox` | `src/components/event/ShareLinkBox.tsx` | 共有リンクのコピー機能付き表示ボックス | EVENT-06 |
| `EventStatusBadge` | `src/components/event/EventStatusBadge.tsx` | オープン中・クローズ済みのステータスバッジ | EVENT-10, EVENT-11 |
| `ConfirmDialog` | `src/components/ui/ConfirmDialog.tsx` | 削除確認ダイアログの共通ラッパー（Dialog 利用） | SHOP-21, EVENT-13, AUTH-14 |
| `PageHeader` | `src/components/ui/PageHeader.tsx` | ページタイトル + 戻るボタンの共通ヘッダー | — |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | 一覧が空の場合の表示（アイコン + メッセージ + CTA） | SHOP-14, EVENT-11 |

---

## 3. フォームコンポーネントパターン

### 3.1 基本パターン

React Hook Form + Zod + shadcn/ui `Form` コンポーネントを組み合わせる。

```tsx
// src/components/shop/ShopNoteForm.tsx（例）
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shopNoteSchema, type ShopNoteInput } from "@/lib/validations/shop";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function ShopNoteForm({ defaultNote }: { defaultNote: string }) {
  const form = useForm<ShopNoteInput>({
    resolver: zodResolver(shopNoteSchema),
    defaultValues: { note: defaultNote },
  });

  async function onSubmit(data: ShopNoteInput) {
    // Route Handler への fetch
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メモ</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="お店のメモを入力..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage /> {/* Zod バリデーションエラーを自動表示 */}
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存する"}
        </Button>
      </form>
    </Form>
  );
}
```

### 3.2 フォームのエラー表示ルール

| エラー種別 | 表示方法 | コンポーネント |
|---|---|---|
| フィールドレベルのバリデーションエラー | フィールド直下に赤テキスト | `FormMessage`（shadcn/ui） |
| サーバーエラー（400・409等） | フォーム上部にアラート | `Alert`（shadcn/ui） |
| ネットワークエラー・500エラー | トースト通知 | `sonner` |

- フィールドエラーは `role="alert"` と `aria-live="polite"` が `FormMessage` に組み込まれているため、スクリーンリーダーに自動通知される。
- `FormLabel` は `htmlFor` が `FormControl` の入力要素 `id` に自動紐付けされる（A11Y-02 対応）。

### 3.3 送信ボタンの状態管理

- 送信中は `disabled` + テキスト「〇〇中...」でフィードバックを与える。
- `form.formState.isSubmitting` を参照して制御する。
- 完了後は `form.reset()` でフォームをリセットするか、画面を遷移する。

---

## 4. 店舗カード（SHOP-15）

### 4.1 ShopCard の構成

```
┌────────────────────────────────────┐
│ [写真サムネイル] [カテゴリバッジ]  │ ← 写真は photo_url が null の場合はグレー背景
│ 店名（text-lg font-semibold）      │
│ エリア・住所（text-sm neutral-500）│
│ ★ 4.2  ¥3,000〜¥5,999            │ ← 外部評価 + 価格帯
│ [タグ1] [タグ2] [タグ3]           │ ← TagBadge（削除ボタンなし）
└────────────────────────────────────┘
```

### 4.2 ShopCard の props

```typescript
type ShopCardProps = {
  shop: {
    id: string;
    name: string;
    area: string | null;
    address: string | null;
    category: string | null;
    priceRange: string | null;
    externalRating: number | null;
    photoUrl: string | null;
    tags: { id: string; name: string }[];
  };
};
```

### 4.3 価格帯の表示ルール

`docs/requirements.md` セクション7.1の変換テーブルに従う。DBには文字列で保存済み（例: `¥3,000〜¥5,999`）のため、そのまま表示する。

### 4.4 タグの表示数制限

カード上では最大3件まで表示する。4件以上ある場合は「+N」のバッジで残数を示す（例: `+2`）。

### 4.5 クリック動作

カード全体がリンク（`<a>` または Next.js `<Link>`）として機能し、店舗詳細ページ `/shops/[id]` に遷移する。`cursor-pointer` を適用する。

---

## 5. フィルタ・ソートUI（SHOP-16・SHOP-17）

### 5.1 レイアウト分岐

| 画面幅 | コンポーネント | 動作 |
|---|---|---|
| md 以上（768px〜） | `ShopFilterBar` | 横一列に並べて常時表示 |
| sm 以下（767px 以下） | フィルタボタン + `ShopFilterSheet` | ボタンタップでボトムシートを開く |

### 5.2 フィルタ項目

| フィルタ | UIコンポーネント | 選択肢 |
|---|---|---|
| ジャンル（カテゴリ） | `Select` | DBに存在するカテゴリ値の一覧（動的取得）+ 「すべて」 |
| 価格帯 | `Select` | 「〜¥999」「¥1,000〜¥2,999」「¥3,000〜¥5,999」「¥6,000〜¥9,999」「¥10,000〜」「価格帯不明」「すべて」 |
| タグ | `Select` | ユーザーのタグ一覧（動的取得）+ 「すべて」 |
| エリア | `Select` | DBに存在するエリア値の一覧（動的取得）+ 「すべて」 |

### 5.3 ソート項目

| ソート | UIコンポーネント | 選択肢 |
|---|---|---|
| 並び順 | `Select` | 「登録日（新しい順）」「登録日（古い順）」「店名（五十音順）」 |

### 5.4 フィルタ状態の管理

- フィルタ値はURLのクエリパラメータで管理する（例: `?category=和食&price=¥1,000〜¥2,999`）。
- これによりページリロード後もフィルタ状態が保持され、URLの共有が可能になる。
- Server Component で `searchParams` を受け取り、DBクエリのWHERE条件として渡す。

### 5.5 フィルタのリセット

「フィルタをリセット」ボタンをフィルタバー・シートに設置する。クリックでクエリパラメータをすべて削除してルートパスに遷移する。

---

## 6. タグ入力コンポーネント（SHOP-07〜SHOP-12）

### 6.1 TagInput の動作仕様

1. 入力フィールドにフォーカスすると、既存タグのサジェストをドロップダウン表示する。
2. 未入力時（フォーカス直後）は SHOP-12 のサジェスト3件（「行きたい」「スタメン入り」「行った」）を優先的に表示する。ユーザーが既存タグを持つ場合はそれも含める。
3. 文字入力で既存タグ名をインクリメンタル検索する（フロントエンドでフィルタリング）。
4. 既存タグを選択するとフィールドに追加される（SHOP-08）。
5. 既存タグに一致しない文字列のままEnterキーを押す、または「新規作成」オプションを選択すると、新規タグとして追加される（SHOP-07）。
6. 追加されたタグは入力フィールドの上部に `TagBadge` として表示される（SHOP-09）。
7. `TagBadge` の「×」ボタンでタグを取り外せる（SHOP-10）。

### 6.2 TagInput の実装方針

shadcn/ui の `Command` + `Popover` を組み合わせる。

```tsx
// src/components/shop/TagInput.tsx（概要）
"use client";

type TagInputProps = {
  selectedTags: { id: string; name: string }[];
  suggestions: { id: string; name: string }[];  // 既存タグ一覧（Server から渡す）
  onChange: (tags: { id: string | null; name: string }[]) => void;
  // id が null の場合は新規タグとして扱う
};
```

### 6.3 TagBadge の構成

```
[タグ名  ×]
```

- 背景: `bg-primary-100` / テキスト: `text-primary-700`
- 「×」ボタンは `aria-label="タグ名 を削除"` を付与する（A11Y-02）。

### 6.4 新規タグの処理フロー

```
入力 → 「"[入力値]" を新規作成」オプションを選択
→ TagInput が onChange に { id: null, name: "[入力値]" } を渡す
→ フォーム送信時に Route Handler で tags テーブルに INSERT
→ 取得した tag.id を shop_tags テーブルに INSERT
```

---

## 7. 投票UIコンポーネント（VOTE-02）

### 7.1 投票フォームの構成

共有ページ（`/events/share/[token]`）に配置する。

```
┌────────────────────────────────────┐
│ イベントタイトル（text-2xl bold）  │
│ イベント説明                       │
├────────────────────────────────────┤
│ ニックネーム入力（必須）           │  ← VOTE-03
│ [___________________________]      │
├────────────────────────────────────┤
│ 候補店舗（1つ以上選択してください）│
│                                    │
│ [x] 店名A                         │  ← VoteShopItem
│     カテゴリ・エリア               │
│                                    │
│ [x] 店名B                         │
│     カテゴリ・エリア               │
│                                    │
│      [投票する]（Button primary）  │
└────────────────────────────────────┘
```

### 7.2 VoteShopItem の構成

```tsx
type VoteShopItemProps = {
  shopName: string;
  category: string | null;
  area: string | null;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};
```

- `Checkbox` コンポーネントを使用。
- `<label>` 要素でチェックボックスと店舗情報をまとめ、クリック領域を広げる（タップ操作対応・UX-01）。
- `aria-label` は不要（隣接する `<label>` が参照先として機能）。

### 7.3 バリデーション

| 項目 | ルール |
|---|---|
| ニックネーム | 必須・最大50文字 |
| 候補店舗の選択 | 1つ以上選択 |

バリデーションエラーは `FormMessage` で表示する（A11Y-02）。

### 7.4 送信後の挙動

- 送信成功後、投票完了画面（S-13）に遷移する。
- 送信後は投票結果の閲覧ページを表示する（VOTE-05a）。

---

## 8. リアルタイム投票結果表示（VOTE-04・VOTE-05）

### 8.1 オーナー向け（リアルタイム更新）

イベント詳細ページ（`/events/[id]`）でオーナーが投票結果をリアルタイムで確認できる。

- Supabase Realtime の `postgres_changes` を購読する。
- 購読は Client Component（`"use client"`）で行う。
- 初期データは Server Component でフェッチして props として渡す。

```tsx
// src/components/vote/VoteResultList.tsx（概要）
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type VoteResult = {
  eventShopId: string;
  shopName: string;
  count: number;
};

export function VoteResultList({
  eventId,
  initialResults,
}: {
  eventId: string;
  initialResults: VoteResult[];
}) {
  const [results, setResults] = useState(initialResults);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`vote_results:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vote_choices",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // 変更検知時に集計を再取得する
          // vote_choices テーブルはネストした結合が必要なため、
          // Route Handler GET /api/votes?eventId=xxx を呼び出す
          fetch(`/api/votes?eventId=${eventId}`)
            .then((res) => res.json())
            .then((data) => setResults(data));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <ul className="space-y-3">
      {results.map((result) => (
        <li key={result.eventShopId}>
          <VoteResultBar result={result} maxCount={Math.max(...results.map((r) => r.count))} />
        </li>
      ))}
    </ul>
  );
}
```

### 8.2 参加者向け（手動更新）

投票完了後の結果表示（VOTE-05a）では、リアルタイム更新ではなく手動更新ボタンを提供する。

- 更新アイコン付きボタン（`Button variant="outline"`）をクリックすると、`fetch` で最新集計を取得して state を更新する。
- ボタンのラベル: 「結果を更新」（スクリーンリーダー用 `aria-label` を同テキストで設定）。

### 8.3 VoteResultBar の構成

```
店名A          ████████████  5票 ← 最多：primary-500 で塗る
店名B          ████          2票 ← neutral-200 で塗る
店名C          ██            1票
```

- `Progress` コンポーネントを使用（`value` = 得票数 / 最多得票数 × 100）。
- 最多得票の店舗には `bg-primary-500` を適用し、`font-bold` でハイライトする（VOTE-05）。
- 同率最多が複数ある場合はすべてハイライトする。

---

## 9. トースト・通知パターン

shadcn/ui の `sonner` を使用する。

### 9.1 トーストの使用場面

| 操作 | トースト種別 | メッセージ例 |
|---|---|---|
| 店舗を追加した | success | 「店舗を登録しました」 |
| 店舗を削除した | success | 「店舗を削除しました」 |
| 店舗のメモを保存した | success | 「メモを保存しました」 |
| イベントを作成した | success | 「イベントを作成しました」 |
| 共有リンクをコピーした | success | 「リンクをコピーしました」 |
| ネットワークエラーが発生した | error | 「通信エラーが発生しました。もう一度お試しください」 |
| サーバーエラー（500）が発生した | error | 「エラーが発生しました。時間をおいてお試しください」 |

### 9.2 Sonner の初期設定

ルートレイアウト（`src/app/layout.tsx`）に `<Toaster>` を配置する。

```tsx
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
```

- `position="bottom-center"` はモバイルで親指が届きやすいため採用する（UX-01）。
- トーストは `aria-live="polite"` を持つため、スクリーンリーダーに自動通知される（A11Y-01）。

---

## 10. スケルトンローダー戦略（PERF-01）

### 10.1 方針

- Next.js App Router の `loading.tsx` + `Suspense` を使ってデータフェッチ中のレイアウトシフトを防ぐ。
- 実際のコンポーネントと同一の寸法・構造のスケルトンを用意し、LCP の体感を改善する。

### 10.2 スケルトン対象コンポーネント

| スケルトン名 | 対象 | 配置ファイル |
|---|---|---|
| `ShopCardSkeleton` | `ShopCard` | `src/components/shop/ShopCardSkeleton.tsx` |
| `ShopListSkeleton` | 店舗一覧（ShopCardSkeleton を4件並べる） | `src/app/(app)/shops/loading.tsx` |
| `EventCardSkeleton` | イベントカード | `src/components/event/EventCardSkeleton.tsx` |
| `VoteResultSkeleton` | 投票結果バー一覧 | `src/components/vote/VoteResultSkeleton.tsx` |

### 10.3 Skeleton の実装パターン

```tsx
// src/components/shop/ShopCardSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function ShopCardSkeleton() {
  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-16 w-16 rounded-md" />     {/* 写真サムネイル */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />               {/* 店名 */}
          <Skeleton className="h-4 w-1/2" />               {/* エリア */}
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-sm" />       {/* タグ1 */}
        <Skeleton className="h-5 w-16 rounded-sm" />       {/* タグ2 */}
      </div>
    </div>
  );
}
```

---

## 11. A11Y 実装パターン（A11Y-01〜A11Y-03）

### 11.1 WCAG 2.1 AA 対応チェックリスト

| 項目 | 対応方法 | 関連コンポーネント |
|---|---|---|
| 1.1.1 非テキストコンテンツ | 店舗写真に `alt="店名の写真"` を付与。アイコンのみのボタンに `aria-label` を付与 | ShopCard, ShareLinkBox |
| 1.4.1 色の使用 | 色のみで情報を伝えない（最多得票のハイライトはアイコンも併用） | VoteResultBar |
| 1.4.3 コントラスト（4.5:1） | `16_brand-design-system.md` セクション2の検証結果に従う（A11Y-03） | 全コンポーネント |
| 2.1.1 キーボード操作 | shadcn/ui は Radix UI ベースのためキーボードナビゲーションが組み込まれている | Dialog, Select, Checkbox |
| 2.4.3 フォーカス順序 | 論理的なDOMの順序でフォーカスが移動するよう `tabIndex` を乱用しない | フォーム全般 |
| 2.4.7 フォーカスの可視化 | `ring-2 ring-primary-500 ring-offset-2` をフォーカス時に適用（ブランドデザインシステム セクション6.1） | Button, Input, TagBadge |
| 3.3.1 エラーの特定 | `FormMessage` により入力エラーをフィールド直下に表示 | フォーム全般 |
| 3.3.2 ラベルまたは説明 | `FormLabel` が `FormControl` の `id` に自動紐付け（A11Y-02） | フォーム全般 |
| 4.1.3 ステータスメッセージ | トースト（sonner）は `aria-live` を持ち、スクリーンリーダーへ自動通知 | Toaster |

### 11.2 フォームのアクセシビリティ実装

shadcn/ui `Form` コンポーネントは以下を自動的に処理するため、追加実装は不要:

- `<label>` と `<input>` の紐付け（`htmlFor` / `id`）
- エラーメッセージの `aria-describedby` による関連付け
- エラーメッセージ表示時の `aria-invalid="true"` の設定

追加で対応が必要な項目:

- 必須フィールドには `<FormLabel>` のテキストに「（必須）」を追記するか `aria-required="true"` を付与する。
- ヒントテキスト（例: パスワード条件の説明）は `<FormDescription>` コンポーネントを使用する。

### 11.3 動的コンテンツのA11Y

| 状況 | 対応 |
|---|---|
| スケルトン表示中 | `aria-busy="true"` をコンテナに付与 |
| 投票結果のリアルタイム更新 | 更新領域に `aria-live="polite"` を付与。オーナー向けは自動更新のため `polite`（主張が強い `assertive` は避ける）|
| ダイアログ（削除確認） | `Dialog` は Radix UI のフォーカストラップが内蔵されているため追加実装不要 |
| タグ追加・削除 | タグ操作後にスクリーンリーダーへ操作結果を通知する `aria-live` 領域をフォームに設置する |

### 11.4 コントラスト比の運用ルール（A11Y-03）

`docs/basic-design/16_brand-design-system.md` セクション2.2のルールをコードレビューで確認する:

- `primary-500`（`#639922`）をテキスト色に使用できる背景: `#ffffff` / `#fafafa` / `#f4f4f5` のみ。
- `primary-500` を背景にする場合、テキスト色は必ず `#ffffff`。
- タグバッジ（`bg-primary-100` + `text-primary-700`）はコントラスト比検証済みの組み合わせを使用する。

---

## 12. レスポンシブ設計（UX-01）

### 12.1 ブレークポイント

Tailwind CSS の標準ブレークポイントを使用する。

| ブレークポイント | 画面幅 | 主な適用 |
|---|---|---|
| （デフォルト） | 0px〜 | モバイルファースト |
| `sm` | 640px〜 | — |
| `md` | 768px〜 | 2カラムレイアウト切り替え |
| `lg` | 1024px〜 | サイドバー表示・デスクトップ最適化 |

### 12.2 ナビゲーション

| 画面幅 | ナビゲーション形式 |
|---|---|
| md 未満 | ボトムナビゲーション（`fixed bottom-0`）。タブ: ホーム（マイリスト）・イベント・アカウント |
| md 以上 | サイドバーナビゲーション（`fixed left-0`） |

### 12.3 店舗一覧のグリッドレイアウト

```
モバイル（〜767px）: 1カラム（ShopCard が縦に並ぶ）
デスクトップ（768px〜）: 2カラム
デスクトップ（1024px〜）: 3カラム
```

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {shops.map((shop) => (
    <ShopCard key={shop.id} shop={shop} />
  ))}
</div>
```

### 12.4 タップ操作の最小サイズ

- インタラクティブ要素（ボタン・チェックボックス・タグの削除ボタン等）は最小44×44pxのタップ領域を確保する（WCAG 2.5.5 Target Size の推奨値）。
- shadcn/ui の `Button` はデフォルトで `h-10`（40px）のため、高さを `h-11`（44px）以上に設定するか、`min-h-[44px]` をカスタムバリアントで定義する。

### 12.5 UX-02 の実装方針（3タップ以内で店舗追加）

店舗追加フロー: `/shops/new`

```
タップ1: 「店舗を追加」ボタンをタップ（ホーム画面）
  ↓
店名入力 → Places API の候補がドロップダウン表示（自動）
タップ2: 候補リストから店舗を選択（情報が自動補完される）
タップ3: 「保存する」ボタンをタップ
```

- 入力フィールドに自動フォーカスをあてて初期タップを省く（`autoFocus` 属性）。
- 候補選択後の「保存する」ボタンはフォームの最後に配置し、タップしやすい全幅ボタン（`w-full`）にする。
