# エラーハンドリングパターン

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-29
**ステータス:** Draft

---

## 目次

1. [エラー種別の分類と対処方針](#1-エラー種別の分類と対処方針)
2. [Route Handler エラーレスポンス統一フォーマット](#2-route-handler-エラーレスポンス統一フォーマット)
3. [HTTP ステータスコードの使い分け](#3-http-ステータスコードの使い分け)
4. [Supabase エラーコードのマッピング](#4-supabase-エラーコードのマッピング)
5. [クライアントサイドのエラーハンドリングパターン](#5-クライアントサイドのエラーハンドリングパターン)
6. [Next.js error.tsx / not-found.tsx の設計](#6-nextjs-errortsx--not-foundtsx-の設計)
7. [Suspense バウンダリの配置方針](#7-suspense-バウンダリの配置方針)
8. [破壊的操作の確認ダイアログパターン](#8-破壊的操作の確認ダイアログパターン)
9. [エラーからの回復フロー](#9-エラーからの回復フロー)
10. [ログ方針](#10-ログ方針)

---

## 1. エラー種別の分類と対処方針

エラーを発生源・重篤度・対処方法の観点で分類する。

### 1.1 エラー分類一覧

| 分類 | 発生源 | HTTP ステータス | ユーザーへの表示 | 対処方針 |
|---|---|---|---|---|
| クライアントバリデーションエラー | Zod（フロント） | — | フィールド直下の赤テキスト | フォーム送信前に検出。Route Handler にリクエストを送らない |
| サーバーバリデーションエラー | Zod（Route Handler） | 400 | フォーム上部のアラート | 二重バリデーション。フィールド名付きで返す |
| 認証エラー | JWT 検証失敗 | 401 | リダイレクト（ログイン画面） | middleware または Route Handler で検出し、ログイン画面へ誘導 |
| 認可エラー | RLS / 権限チェック | 403 | トースト通知（エラー） | 他ユーザーのリソースへのアクセス |
| リソース未検出 | DB クエリ | 404 | not-found.tsx またはトースト | リソース削除後の操作等 |
| クローズ済みイベント | イベント状態チェック | 410 | 専用エラー画面 | share_token 経由での投票時 |
| 重複エラー | DB ユニーク制約 | 409 | フォーム上部のアラート | 同名タグ等の重複 |
| 外部 API エラー | Google Places API | 422 | インラインメッセージ＋フォールバック | SHOP-05 の手動入力モードへの切り替え |
| タイムアウト / ネットワークエラー | fetch / AbortController | — | トースト通知（エラー） | リトライボタンを提供（PERF-02） |
| レートリミット超過 | Cloudflare / Supabase | 429 | トースト通知（エラー） | 自動リトライは行わない。ユーザーに待機を案内 |
| サーバー内部エラー | 予期せぬ例外 | 500 | トースト通知（エラー） | 技術的詳細はログのみ。ユーザーには汎用メッセージ |

### 1.2 ユーザー向けメッセージ vs 技術的ログの分離方針

- **ユーザー向けメッセージ:** 原因を平易な日本語で説明し、次にとるべきアクションを示す。スタックトレースや DB エラーコードは含めない。
- **技術的ログ:** `console.error` に元のエラーオブジェクト（エラーコード・スタックトレース）を出力する。本番環境では外部ログサービスへの転送を想定する（詳細はセクション10参照）。

---

## 2. Route Handler エラーレスポンス統一フォーマット

### 2.1 エラーレスポンス型

すべての Route Handler は以下の統一形式でエラーを返す（`05_api-route-handlers.md` セクション3と同一定義）。

```typescript
type ErrorResponse = {
  error: string    // 人間が読めるエラーメッセージ（日本語）
  code?: string    // アプリ固有のエラーコード（省略可能）
}
```

`code` フィールドはクライアントが機械的に判断する必要がある場合にのみ付与する（例: 同一フォームで複数種のエラーを区別する場合）。

### 2.2 バリデーションエラーの詳細返却

フォームのフィールドレベルエラーを返す場合は、`errors` フィールドを追加する。

```typescript
// 400 バリデーションエラー
type ValidationErrorResponse = {
  error: string                             // 「入力内容を確認してください」等の概要メッセージ
  errors?: Record<string, string[]>         // フィールド名 → エラーメッセージ配列
}

// 例
{
  "error": "入力内容を確認してください",
  "errors": {
    "name": ["店舗名は必須です"],
    "email": ["メールアドレスの形式が正しくありません"]
  }
}
```

### 2.3 Route Handler の実装パターン

```typescript
// src/app/api/shops/route.ts（例）
import { NextResponse } from "next/server";
import { z } from "zod";
import { shopSchema } from "@/lib/validations/shop";

export async function POST(request: Request) {
  // 1. 認証チェック
  const supabase = createServerClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "ログインが必要です" },
      { status: 401 }
    );
  }

  // 2. Zod バリデーション
  const body = await request.json();
  const result = shopSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "入力内容を確認してください",
        errors: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // 3. DB 操作
  try {
    // ... DB クエリ
  } catch (err) {
    // DB エラーはユーザーに詳細を返さない
    console.error("[POST /api/shops] DB error:", err);
    return NextResponse.json(
      { error: "内部エラーが発生しました" },
      { status: 500 }
    );
  }
}
```

---

## 3. HTTP ステータスコードの使い分け

`05_api-route-handlers.md` セクション3の一覧を正とする。ここでは判断に迷いやすいケースを補足する。

### 3.1 400 vs 422 の使い分け

| ステータス | 使用条件 |
|---|---|
| 400 Bad Request | Zod バリデーション失敗（必須項目欠損・型不一致・文字数超過等）。構文的に不正なリクエスト |
| 422 Unprocessable Entity | 構文は正しいが意味的に処理できない場合（例: Google Places URLから店舗情報が取得できない、URLの形式は正しいがPlaces APIが空レスポンスを返した）|

### 3.2 403 vs 404 の使い分け

他ユーザーのリソースにアクセスされた場合、存在を知られないようにするため 404 を返すことも一般的だが、Tokoco では RLS がデータアクセスを遮断するため DB クエリ結果が空になる。この場合は 404 を返す（リソース不在と区別しない）。

```typescript
// RLS でフィルタされた結果が空 → 404
const shop = await db.select().from(shops).where(eq(shops.id, id)).limit(1);
if (shop.length === 0) {
  return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
}
```

403 を明示的に返すのは、リソースの存在は確認できるが操作権限がない場合に限る（例: イベントの作成者でないユーザーがクローズ操作を試みた場合）。

### 3.3 410 Gone の使用場面

クローズ済みイベントへの share_token アクセスには 410 を返す。404 ではなくイベントが「存在するが終了した」ことをクライアントに伝えることで、適切なエラー画面の表示を可能にする。

---

## 4. Supabase エラーコードのマッピング

### 4.1 Supabase Auth エラー

| Supabase エラーコード / メッセージ | HTTP ステータス | ユーザーメッセージ |
|---|---|---|
| `invalid_credentials` | 401 | 「メールアドレスまたはパスワードが正しくありません」 |
| `email_not_confirmed` | 401 | 「メールアドレスの確認が完了していません。確認メールのリンクをクリックしてください」 |
| `user_already_exists` | 409 | 「このメールアドレスはすでに登録されています」 |
| `weak_password` | 400 | 「パスワードは8文字以上で、英字と数字を含めてください」 |
| `over_request_rate_limit` | 429 | 「リクエストが多すぎます。しばらく後にお試しください」 |
| `session_not_found` | 401 | 「セッションが切れました。再度ログインしてください」 |

```typescript
// src/lib/supabase/auth-error-map.ts
export function mapAuthError(error: AuthError): { status: number; message: string } {
  switch (error.code) {
    case "invalid_credentials":
      return { status: 401, message: "メールアドレスまたはパスワードが正しくありません" };
    case "email_not_confirmed":
      return { status: 401, message: "メールアドレスの確認が完了していません。確認メールのリンクをクリックしてください" };
    case "user_already_exists":
      return { status: 409, message: "このメールアドレスはすでに登録されています" };
    case "weak_password":
      return { status: 400, message: "パスワードは8文字以上で、英字と数字を含めてください" };
    case "over_request_rate_limit":
      return { status: 429, message: "リクエストが多すぎます。しばらく後にお試しください" };
    default:
      return { status: 500, message: "認証エラーが発生しました" };
  }
}
```

### 4.2 Supabase DB エラー（PostgreSQL エラーコード）

| PostgreSQL エラーコード | エラー名 | HTTP ステータス | ユーザーメッセージ |
|---|---|---|---|
| `23505` | unique_violation | 409 | リソース種別ごとに個別メッセージ（下記参照） |
| `23503` | foreign_key_violation | 400 | 「関連するデータが見つかりません」 |
| `42501` | insufficient_privilege | 403 | 「このリソースへのアクセス権限がありません」 |

409 のユーザーメッセージ例:
- タグ重複: 「同名のタグがすでに存在します」
- メール重複: 「このメールアドレスはすでに登録されています」（Auth エラーと統一）

```typescript
// src/lib/supabase/db-error-map.ts
import type { PostgresError } from "postgres";

export function mapDbError(err: unknown): { status: number; message: string } {
  const pgErr = err as { code?: string };
  switch (pgErr.code) {
    case "23505":
      return { status: 409, message: "同じデータがすでに存在します" };
    case "23503":
      return { status: 400, message: "関連するデータが見つかりません" };
    case "42501":
      return { status: 403, message: "このリソースへのアクセス権限がありません" };
    default:
      return { status: 500, message: "内部エラーが発生しました" };
  }
}
```

### 4.3 Google Places API エラー

| Places API ステータス | HTTP ステータス | ユーザーメッセージ | 対処 |
|---|---|---|---|
| `ZERO_RESULTS` | 200（空配列） | — | 検索結果が0件として正常返却 |
| `INVALID_REQUEST` | 400 | 「検索キーワードを入力してください」 | クライアント側バリデーションで事前防止 |
| `REQUEST_DENIED` | 500 | 「店舗情報の取得に失敗しました。手動で入力してください」 | API キー設定ミス。ログに詳細出力 |
| `OVER_QUERY_LIMIT` | 429 | 「現在店舗情報の自動取得ができません。手動で入力してください」 | 手動入力フォールバックへ誘導（SHOP-05） |
| ネットワークエラー / タイムアウト | 422 | 「店舗情報の取得に失敗しました。手動で入力してください」 | 手動入力フォールバックへ誘導（SHOP-05） |

---

## 5. クライアントサイドのエラーハンドリングパターン

### 5.1 エラー表示の3パターン

`06_ui-components.md` セクション3.2のルールを詳細化する。

| パターン | 使用場面 | コンポーネント | 自動消去 |
|---|---|---|---|
| **フィールドインライン** | フォームフィールドの入力エラー | `FormMessage`（shadcn/ui） | フィールド修正時に消去 |
| **フォームアラート** | サーバー返却の 400・409 エラー | `Alert`（shadcn/ui）`variant="destructive"` | フォーム再送信時に消去 |
| **トースト通知** | 成功・ネットワークエラー・500 エラー・403・429 | `sonner`（shadcn/ui） | 5秒後に自動消去（エラーは手動消去も可） |
| **リダイレクト** | 401 セッション切れ | `router.replace("/login")` | — |
| **専用エラー画面** | 404（ページ全体）・410（クローズ済みイベント） | `not-found.tsx` / `error.tsx` | — |

### 5.2 トースト通知の種別と表示ルール

```typescript
// sonner を使用したトースト呼び出しの統一パターン
import { toast } from "sonner";

// 成功
toast.success("店舗を登録しました");

// エラー（ネットワーク・500・403・429 等）
toast.error("エラーが発生しました。しばらく後にお試しください");

// 情報
toast.info("イベントをクローズしました");
```

**表示時間:**
- success: 4秒後に自動消去
- error: 8秒後に自動消去（ユーザーが読む時間を確保）
- info: 4秒後に自動消去

**表示位置:** `bottom-center`（モバイルでの視認性を優先）

### 5.3 fetch ラッパーパターン

Route Handler への fetch は共通ラッパーを経由し、エラーハンドリングを一元化する。

```typescript
// src/lib/fetch-api.ts

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; errors?: Record<string, string[]> };

export async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal: options?.signal ?? AbortSignal.timeout(10_000), // 10秒タイムアウト（PERF-02）
    });

    if (response.ok) {
      const data = response.status === 204 ? null : await response.json();
      return { ok: true, data: data as T };
    }

    // 4xx / 5xx
    const errorBody = await response.json().catch(() => ({ error: "エラーが発生しました" }));
    return {
      ok: false,
      status: response.status,
      error: errorBody.error ?? "エラーが発生しました",
      errors: errorBody.errors,
    };
  } catch (err) {
    // ネットワークエラー・タイムアウト
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return { ok: false, status: 0, error: "リクエストがタイムアウトしました。通信状況を確認してください" };
    }
    return { ok: false, status: 0, error: "ネットワークエラーが発生しました" };
  }
}
```

### 5.4 フォームコンポーネントでのエラー処理パターン

```typescript
// "use client" コンポーネント内での標準パターン
async function onSubmit(data: ShopInput) {
  const result = await fetchApi<ShopResponse>("/api/shops", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!result.ok) {
    if (result.status === 401) {
      router.replace("/login");
      return;
    }
    if (result.status === 400 && result.errors) {
      // フィールドエラーを React Hook Form にセット
      for (const [field, messages] of Object.entries(result.errors)) {
        form.setError(field as keyof ShopInput, { message: messages[0] });
      }
      setFormError(result.error); // フォーム上部のアラート
      return;
    }
    // 409 等の概要エラー
    if (result.status === 409) {
      setFormError(result.error);
      return;
    }
    // その他（403・429・500・ネットワークエラー）
    toast.error(result.error);
    return;
  }

  toast.success("店舗を登録しました");
  router.push(`/shops/${result.data.id}`);
}
```

### 5.5 Server Component でのエラー処理

Server Component でのデータフェッチエラーは、Next.js の `error.tsx` に委ねる。

```typescript
// src/app/(app)/shops/[id]/page.tsx（Server Component）
export default async function ShopDetailPage({ params }: { params: { id: string } }) {
  const shop = await getShop(params.id); // 内部で DB クエリ

  if (!shop) {
    notFound(); // → not-found.tsx を表示
  }

  return <ShopDetail shop={shop} />;
}
```

---

## 6. Next.js error.tsx / not-found.tsx の設計

### 6.1 error.tsx の配置

| ファイルパス | 対象範囲 | 表示内容 |
|---|---|---|
| `src/app/(app)/error.tsx` | 会員向け全画面 | 汎用エラー画面（リトライボタン付き） |
| `src/app/(app)/shops/error.tsx` | 店舗セクション | 将来的に追加（v1.0 は親の error.tsx に委ねる） |
| `src/app/events/share/[token]/error.tsx` | ゲスト投票画面 | 投票不可エラー（410 Gone 専用画面を含む） |

### 6.2 error.tsx の仕様

```typescript
// src/app/(app)/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 本番: 外部ログサービスへ送信（セクション10参照）
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h2 className="text-xl font-semibold text-neutral-900">
        問題が発生しました
      </h2>
      <p className="text-sm text-neutral-500">
        しばらく時間をおいてから再度お試しください。
      </p>
      <Button onClick={reset} variant="outline">
        再試行する
      </Button>
    </div>
  );
}
```

### 6.3 not-found.tsx の仕様

```typescript
// src/app/(app)/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h2 className="text-xl font-semibold text-neutral-900">
        ページが見つかりません
      </h2>
      <p className="text-sm text-neutral-500">
        このページは存在しないか、削除された可能性があります。
      </p>
      <Button asChild variant="outline">
        <Link href="/shops">マイリストに戻る</Link>
      </Button>
    </div>
  );
}
```

### 6.4 ゲスト投票画面の 410 専用エラー表示

クローズ済みイベントへの share_token アクセス時は、汎用エラーではなく専用メッセージを表示する。

```typescript
// src/app/events/share/[token]/page.tsx（Server Component）
export default async function ShareEventPage({ params }: { params: { token: string } }) {
  const result = await fetchApi<EventForVoting>(`/api/share/${params.token}`);

  if (!result.ok) {
    if (result.status === 410) {
      return <ClosedEventPage />;  // 「このイベントは終了しました」専用コンポーネント
    }
    if (result.status === 404) {
      notFound();
    }
    throw new Error(result.error); // error.tsx に委ねる
  }

  return <VotingPage event={result.data} />;
}
```

`ClosedEventPage` の表示内容:
- タイトル: 「このイベントは終了しました」
- 本文: 「投票受付は終了しています。主催者にお問い合わせください。」
- アクション: なし（ボタン不要）

---

## 7. Suspense バウンダリの配置方針

### 7.1 配置ルール

- **ページ単位:** `loading.tsx` ファイルで自動的に Suspense バウンダリが設定される。
- **コンポーネント単位:** データフェッチが重い部分（店舗一覧・投票結果等）を `<Suspense>` で囲い、スケルトンローダーを表示する。

```typescript
// src/app/(app)/shops/page.tsx
import { Suspense } from "react";
import { ShopList } from "@/components/shop/ShopList";
import { ShopListSkeleton } from "@/components/shop/ShopListSkeleton";

export default function ShopsPage() {
  return (
    <div>
      <PageHeader title="マイリスト" />
      <Suspense fallback={<ShopListSkeleton />}>
        <ShopList />
      </Suspense>
    </div>
  );
}
```

### 7.2 loading.tsx の配置

| ファイルパス | 用途 |
|---|---|
| `src/app/(app)/shops/loading.tsx` | 店舗一覧ページの初回ロード |
| `src/app/(app)/events/loading.tsx` | イベント一覧ページの初回ロード |
| `src/app/(app)/events/[id]/loading.tsx` | イベント詳細ページの初回ロード |

`loading.tsx` の実装はページレイアウトに合わせたスケルトン（`ShopCardSkeleton` 等）を使用する（`06_ui-components.md` セクション10参照）。

---

## 8. 破壊的操作の確認ダイアログパターン

要件 SHOP-21・EVENT-13・AUTH-14 の確認ダイアログは `ConfirmDialog` コンポーネントで統一する（`06_ui-components.md` セクション2参照）。

### 8.1 ConfirmDialog の仕様

```typescript
// src/components/ui/ConfirmDialog.tsx
type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;                // 例: 「店舗を削除しますか？」
  description: string;          // 例: 「この操作は取り消せません。」
  confirmLabel?: string;        // デフォルト: 「削除する」
  cancelLabel?: string;         // デフォルト: 「キャンセル」
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;          // 確認ボタンのローディング状態
  variant?: "destructive" | "default";  // デフォルト: "destructive"
};
```

### 8.2 各操作のダイアログ文言

| 操作 | title | description | confirmLabel |
|---|---|---|---|
| 店舗削除（SHOP-21） | 「[店舗名] を削除しますか？」 | 「この操作は取り消せません。店舗に紐づくタグの付与情報も削除されます。」 | 「削除する」 |
| イベント削除（EVENT-13） | 「[イベント名] を削除しますか？」 | 「この操作は取り消せません。投票データも含めてすべて削除されます。」 | 「削除する」 |
| アカウント削除（AUTH-14） | 「アカウントを削除しますか？」 | 「この操作は取り消せません。登録した店舗・イベント・投票データはすべて削除されます。」 | 「アカウントを削除する」 |

### 8.3 ConfirmDialog の実装パターン

```typescript
// src/components/shop/DeleteShopButton.tsx
"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch-api";
import { useRouter } from "next/navigation";

type DeleteShopButtonProps = {
  shopId: string;
  shopName: string;
};

export function DeleteShopButton({ shopId, shopName }: DeleteShopButtonProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    setIsLoading(true);
    const result = await fetchApi(`/api/shops/${shopId}`, { method: "DELETE" });
    setIsLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      setOpen(false);
      return;
    }

    toast.success("店舗を削除しました");
    setOpen(false);
    router.push("/shops");
    router.refresh();
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        削除
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`${shopName} を削除しますか？`}
        description="この操作は取り消せません。店舗に紐づくタグの付与情報も削除されます。"
        confirmLabel="削除する"
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </>
  );
}
```

### 8.4 A11Y 要件

- ダイアログが開いた際に確認ボタンにフォーカスを移動する（デフォルト）。
- `role="alertdialog"` を付与し、スクリーンリーダーへ警告性を伝える。
- `aria-describedby` で description をダイアログに紐付ける。
- shadcn/ui の `Dialog` コンポーネントはこれらのアクセシビリティ属性を自動付与する。

---

## 9. エラーからの回復フロー

### 9.1 リトライパターン

ネットワークエラー・タイムアウト・500 エラー発生時は、ユーザーが手動でリトライできる UI を提供する。

**トーストのリトライ（一時的なエラー向け）:**

```typescript
toast.error("通信エラーが発生しました", {
  action: {
    label: "再試行",
    onClick: () => handleSubmit(), // 元のアクションを再実行
  },
  duration: 10_000, // 10秒表示
});
```

**error.tsx のリトライ（ページ全体エラー向け）:**

`reset()` 関数を呼び出すことでエラーバウンダリを再レンダリングする（セクション6.2参照）。

### 9.2 Google Places API フォールバック（SHOP-05）

店舗検索・詳細取得で Google Places API エラーが発生した場合、手動入力モードに切り替える。

**フロー:**

```
店名入力 → 候補検索リクエスト
  ↓ API エラー（OVER_QUERY_LIMIT / ネットワークエラー 等）
  ↓
インラインメッセージ: 「候補を取得できませんでした。手動で情報を入力してください」
  ↓
手動入力フォームを展開（店名・住所・カテゴリ 等のフィールドを表示）
```

**実装方針:**
- `ShopAddForm` コンポーネント内で `isPlacesApiError: boolean` 状態を管理する。
- Places API エラー時に `isPlacesApiError = true` にセットし、手動入力フィールドを表示する。
- 手動入力モードでは `photo_url`・`external_rating`・`google_maps_url` は空のまま登録する。

### 9.3 セッション切れからの回復

JWT 期限切れで 401 が返った場合の回復フロー:

```
401 レスポンス受信
  ↓
fetchApi ラッパーが { ok: false, status: 401 } を返す
  ↓
クライアントコンポーネント: router.replace("/login?redirect=" + encodeURIComponent(pathname))
  ↓
ログイン完了後: redirect パラメータの URL に遷移
```

middleware でも未認証リクエストをログイン画面へリダイレクトするが、client-side でも 401 受信時に即座にリダイレクトする二重対応とする。

---

## 10. ログ方針

### 10.1 開発環境

すべてのエラーを `console.error` に出力する。ユーザーメッセージと技術詳細を明確に分離する。

```typescript
// Route Handler でのログ出力パターン
console.error("[POST /api/shops] DB error:", {
  userId: user.id,
  error: err,
  requestBody: result.data, // バリデーション済みデータのみ（生リクエストは含めない）
});
```

### 10.2 本番環境

本番環境では `console.error` 出力に加え、外部ログサービスへの転送を行う。v1.0 では Cloudflare の組み込みログ（Workers Logs）を使用し、将来的に Sentry 等への移行を検討する。

**ログに含める情報:**
- タイムスタンプ
- エンドポイント（パス・メソッド）
- ユーザーID（認証済みの場合。PII であるメールアドレス・名前は含めない）
- エラーコード・スタックトレース
- リクエスト ID（`crypto.randomUUID()` で生成し `x-request-id` ヘッダーに付与）

**ログに含めてはいけない情報（SEC 要件）:**
- パスワード・トークン・API キー
- 個人情報（メールアドレス・電話番号・住所）
- リクエストボディ全体（バリデーション済みフィールドのみ可）

### 10.3 エラーログのレベル定義

| レベル | 用途 | 出力先 |
|---|---|---|
| `error` | 予期せぬ例外・500 エラー・外部 API 障害 | console.error + 外部ログ（本番） |
| `warn` | 想定内だが監視すべき事象（429 レートリミット超過・Places API エラー等） | console.warn |
| `info` | 重要な操作ログ（アカウント削除・イベントクローズ等） | console.info（開発のみ） |

### 10.4 クライアントサイドのエラートラッキング

v1.0 では実装しない。v2.0 以降で Sentry のブラウザ SDK 導入を検討する。`error.tsx` の `useEffect` 内でエラーをキャプチャする準備として、コメントアウトされた Sentry 呼び出しを残しておく。
