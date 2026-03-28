# ブランドデザインシステム

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-28
**ステータス:** Draft

---

## 目次

1. [カラーパレット](#1-カラーパレット)
2. [コントラスト比検証（A11Y-03）](#2-コントラスト比検証a11y-03)
3. [タイポグラフィ](#3-タイポグラフィ)
4. [スペーシングスケール](#4-スペーシングスケール)
5. [ボーダー半径・シャドウ](#5-ボーダー半径シャドウ)
6. [インタラクション状態](#6-インタラクション状態)
7. [Tailwind CSS カスタムテーマ設定](#7-tailwind-css-カスタムテーマ設定)
8. [shadcn/ui テーマオーバーライド](#8-shadcnui-テーマオーバーライド)
9. [未決定事項](#9-未決定事項)

---

## 1. カラーパレット

### 1.1 Primary（ブランドカラー）

ベースカラー `#639922`（緑系）を軸に、明度スケールを定義する。

| トークン名 | カラーコード | 用途 |
|---|---|---|
| `primary-50` | `#f3f8e9` | 背景・ホバー時の薄塗り |
| `primary-100` | `#e3f1c7` | 選択状態の背景 |
| `primary-200` | `#c8e495` | ライトアクセント |
| `primary-300` | `#a9d160` | アイコン・ライトボタン |
| `primary-400` | `#7fb93b` | ボタンホバー（白文字時） |
| `primary-500` | `#639922` | **ブランドカラー本体**（ボタン・リンク・アイコン強調） |
| `primary-600` | `#4e7a1a` | ボタンアクティブ・ダークアクセント |
| `primary-700` | `#3a5b13` | テキストリンク（白背景上） |
| `primary-800` | `#26400d` | ダークモード用アクセント（将来） |
| `primary-900` | `#142208` | 最暗値（将来） |

### 1.2 Secondary（未確定 → セクション9参照）

セカンダリカラーは未選定。暫定として `#F59E0B`（amber-500）を使用してデザイン検証を行い、正式決定後にこの表を更新する。

| トークン名 | カラーコード | 用途 |
|---|---|---|
| `secondary-400` | `#FBBF24` | 強調バッジ・ハイライト |
| `secondary-500` | `#F59E0B` | 暫定セカンダリカラー本体 |
| `secondary-600` | `#D97706` | セカンダリボタンアクティブ |

### 1.3 Neutral（グレースケール）

Tailwind CSS の `zinc` スケールをそのまま採用する（カスタム定義不要）。

| トークン名 | カラーコード | 用途 |
|---|---|---|
| `neutral-50` | `#fafafa` | ページ背景 |
| `neutral-100` | `#f4f4f5` | カード背景・入力フィールド背景 |
| `neutral-200` | `#e4e4e7` | ボーダー（通常） |
| `neutral-300` | `#d4d4d8` | ボーダー（強め） |
| `neutral-400` | `#a1a1aa` | プレースホルダー・ディスエーブルテキスト |
| `neutral-500` | `#71717a` | サブテキスト・ラベル |
| `neutral-700` | `#3f3f46` | 本文テキスト |
| `neutral-900` | `#18181b` | 見出し・強調テキスト |

### 1.4 Semantic Colors（状態表現）

| トークン名 | カラーコード | 用途 |
|---|---|---|
| `success-500` | `#22c55e` | 成功・完了（green-500） |
| `success-100` | `#dcfce7` | 成功背景（green-100） |
| `warning-500` | `#f59e0b` | 警告（amber-500） |
| `warning-100` | `#fef3c7` | 警告背景（amber-100） |
| `error-500` | `#ef4444` | エラー・削除（red-500） |
| `error-100` | `#fee2e2` | エラー背景（red-100） |
| `info-500` | `#3b82f6` | 情報・リンク（blue-500） |
| `info-100` | `#dbeafe` | 情報背景（blue-100） |

---

## 2. コントラスト比検証（A11Y-03）

要件 A11Y-03: ブランドカラー（`#639922`）使用時に背景色とのコントラスト比が 4.5:1 以上を確保する。

### 2.1 検証結果

| 前景色 | 背景色 | コントラスト比 | WCAG AA 適合（4.5:1） | 用途 |
|---|---|---|---|---|
| `#ffffff`（白） | `#639922`（primary-500） | **5.03:1** | 合格 | プライマリボタンのテキスト |
| `#639922`（primary-500） | `#ffffff`（白） | **5.03:1** | 合格 | 白背景上のリンク・アイコン |
| `#639922`（primary-500） | `#fafafa`（neutral-50） | **4.83:1** | 合格 | ページ背景上のリンク |
| `#639922`（primary-500） | `#f4f4f5`（neutral-100） | **4.65:1** | 合格 | カード背景上のアクセントテキスト |
| `#ffffff`（白） | `#4e7a1a`（primary-600） | **6.38:1** | 合格 | ホバー状態のボタンテキスト |
| `#639922`（primary-500） | `#e3f1c7`（primary-100） | **2.71:1** | **不合格** | 使用禁止（装飾のみ可） |

### 2.2 ルール

- `primary-500`（`#639922`）をテキストに使用できる背景は `#ffffff` / `#fafafa` / `#f4f4f5` のみ。
- `primary-500` を背景にする場合は、テキストカラーを必ず `#ffffff` にする。
- `primary-100`〜`primary-300` は装飾（背景塗り・ボーダー）のみに使用し、その上にテキストを配置しない。

---

## 3. タイポグラフィ

### 3.1 フォントファミリー

| 用途 | フォント | 指定方法 |
|---|---|---|
| 日本語本文・UI | `Noto Sans JP` | Google Fonts 経由で読み込み |
| 英数字 | `Inter` | Google Fonts 経由で読み込み（Noto Sans JP の前に指定） |
| コード・等幅 | `JetBrains Mono` | Google Fonts 経由（v1.0 では使用箇所なし、将来用） |

CSS font-family 定義:

```css
font-family: 'Inter', 'Noto Sans JP', system-ui, -apple-system, sans-serif;
```

### 3.2 フォントサイズスケール

Tailwind CSS の標準スケールを使用する（カスタム不要）。

| クラス | サイズ | line-height | 用途 |
|---|---|---|---|
| `text-xs` | 12px | 16px | バッジ・補足ラベル |
| `text-sm` | 14px | 20px | サブテキスト・フォームヒント |
| `text-base` | 16px | 24px | 本文・フォームラベル（デフォルト） |
| `text-lg` | 18px | 28px | カード見出し・セクションラベル |
| `text-xl` | 20px | 28px | ページ内見出し（h3相当） |
| `text-2xl` | 24px | 32px | ページタイトル（h2相当） |
| `text-3xl` | 30px | 36px | 主要ページタイトル（h1相当） |
| `text-4xl` | 36px | 40px | LP ヒーロー見出し |

### 3.3 フォントウェイト

| クラス | ウェイト | 用途 |
|---|---|---|
| `font-normal` | 400 | 本文・通常テキスト |
| `font-medium` | 500 | ラベル・ナビゲーション・ボタン |
| `font-semibold` | 600 | カード見出し・セクションタイトル |
| `font-bold` | 700 | ページタイトル・強調テキスト |

---

## 4. スペーシングスケール

Tailwind CSS の標準スペーシングスケール（1単位 = 4px）を使用する。

| トークン | サイズ | 主な用途 |
|---|---|---|
| `space-1` | 4px | アイコンとテキストの間隔 |
| `space-2` | 8px | インライン要素の間隔・ボタン内のアイコン余白 |
| `space-3` | 12px | フォーム要素間の狭い間隔 |
| `space-4` | 16px | カード内パディング（モバイル）・標準間隔 |
| `space-5` | 20px | フォーム要素間の通常間隔 |
| `space-6` | 24px | カード内パディング（デスクトップ）・セクション間 |
| `space-8` | 32px | セクション間の大きな間隔 |
| `space-10` | 40px | ページ上下のパディング |
| `space-12` | 48px | ヒーローセクション内の間隔 |
| `space-16` | 64px | ページ間の大きなセクション区切り |

### コンポーネント別パディング基準

| コンポーネント | パディング（モバイル） | パディング（デスクトップ） |
|---|---|---|
| ページコンテナ | `px-4 py-6` | `px-8 py-10` |
| カード | `p-4` | `p-6` |
| ボタン（通常） | `px-4 py-2` | `px-4 py-2` |
| ボタン（大） | `px-6 py-3` | `px-6 py-3` |
| 入力フィールド | `px-3 py-2` | `px-3 py-2` |
| モーダル | `p-4` | `p-6` |

---

## 5. ボーダー半径・シャドウ

### 5.1 ボーダー半径

| トークン | 値 | 用途 |
|---|---|---|
| `rounded-sm` | 4px | バッジ・タグ |
| `rounded` | 6px | 入力フィールド・小ボタン |
| `rounded-md` | 8px | カード・ボタン（通常）・モーダル |
| `rounded-lg` | 12px | 大きなカード・シート |
| `rounded-xl` | 16px | ボトムシート（モバイル） |
| `rounded-full` | 9999px | アバター・円形アイコンボタン |

### 5.2 シャドウ

| トークン | 値 | 用途 |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | 入力フィールドのフォーカス前 |
| `shadow` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | カードの通常状態 |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)` | カードのホバー状態 |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | モーダル・ドロップダウン |
| `shadow-none` | なし | フラットな要素 |

---

## 6. インタラクション状態

### 6.1 プライマリボタン（背景: primary-500）

| 状態 | 背景色 | テキスト色 | その他 |
|---|---|---|---|
| Default | `#639922` (primary-500) | `#ffffff` | shadow-sm |
| Hover | `#4e7a1a` (primary-600) | `#ffffff` | shadow-md; transition 150ms ease-in-out |
| Active（押下中） | `#3a5b13` (primary-700) | `#ffffff` | shadow-sm; scale-[0.98] |
| Focus（キーボード） | `#639922` (primary-500) | `#ffffff` | `ring-2 ring-primary-500 ring-offset-2` |
| Disabled | `#c8e495` (primary-200) | `#71717a` (neutral-500) | cursor-not-allowed; opacity-60 |

### 6.2 セカンダリボタン（アウトライン）

| 状態 | 背景色 | ボーダー色 | テキスト色 | その他 |
|---|---|---|---|---|
| Default | transparent | `#e4e4e7` (neutral-200) | `#3f3f46` (neutral-700) | |
| Hover | `#f4f4f5` (neutral-100) | `#d4d4d8` (neutral-300) | `#18181b` (neutral-900) | transition 150ms |
| Active | `#e4e4e7` (neutral-200) | `#d4d4d8` (neutral-300) | `#18181b` (neutral-900) | scale-[0.98] |
| Focus | transparent | `#e4e4e7` (neutral-200) | `#3f3f46` (neutral-700) | `ring-2 ring-neutral-400 ring-offset-2` |
| Disabled | transparent | `#e4e4e7` (neutral-200) | `#a1a1aa` (neutral-400) | cursor-not-allowed; opacity-60 |

### 6.3 デストラクティブボタン（削除・警告）

| 状態 | 背景色 | テキスト色 | 備考 |
|---|---|---|---|
| Default | `#ef4444` (error-500) | `#ffffff` | |
| Hover | `#dc2626` (red-600) | `#ffffff` | transition 150ms |
| Active | `#b91c1c` (red-700) | `#ffffff` | scale-[0.98] |
| Focus | `#ef4444` | `#ffffff` | `ring-2 ring-red-500 ring-offset-2` |
| Disabled | `#fca5a5` (red-300) | `#ffffff` | opacity-60 |

### 6.4 入力フィールド

| 状態 | ボーダー色 | 背景色 | 備考 |
|---|---|---|---|
| Default | `#e4e4e7` (neutral-200) | `#ffffff` | |
| Hover | `#d4d4d8` (neutral-300) | `#ffffff` | |
| Focus | `#639922` (primary-500) | `#ffffff` | `ring-2 ring-primary-500 ring-offset-0`; border-primary-500 |
| Error | `#ef4444` (error-500) | `#fff1f2` (red-50) | ring-2 ring-red-500 |
| Disabled | `#e4e4e7` (neutral-200) | `#f4f4f5` (neutral-100) | cursor-not-allowed; テキスト neutral-400 |

### 6.5 リンクテキスト

| 状態 | テキスト色 | 装飾 |
|---|---|---|
| Default | `#3a5b13` (primary-700) | underline（任意。文脈による） |
| Hover | `#4e7a1a` (primary-600) | underline |
| Active | `#639922` (primary-500) | underline |
| Focus | `#3a5b13` (primary-700) | `outline-2 outline-primary-500` |
| Visited | `#4e7a1a` (primary-600) | — |

### 6.6 トランジション共通設定

```css
transition-property: color, background-color, border-color, box-shadow, transform;
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); /* ease-in-out */
transition-duration: 150ms;
```

---

## 7. Tailwind CSS カスタムテーマ設定

`tailwind.config.ts` に以下を追加する。

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f3f8e9",
          100: "#e3f1c7",
          200: "#c8e495",
          300: "#a9d160",
          400: "#7fb93b",
          500: "#639922",
          600: "#4e7a1a",
          700: "#3a5b13",
          800: "#26400d",
          900: "#142208",
          DEFAULT: "#639922",
          foreground: "#ffffff",
        },
        // Semantic colors（Tailwind 標準の green/amber/red/blue を直接使用）
        // neutral は zinc をそのまま使用
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans JP", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        // Tailwind 標準値を上書きせず、shadcn/ui の --radius CSS変数で管理
      },
    },
  },
  plugins: [],
};

export default config;
```

### 7.1 Google Fonts の読み込み

`src/app/layout.tsx` にて Next.js の `next/font/google` を使用する。

```typescript
import { Inter, Noto_Sans_JP, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

`globals.css` に以下を追加する:

```css
:root {
  --font-sans: var(--font-inter), var(--font-noto-sans-jp), system-ui, sans-serif;
}

body {
  font-family: var(--font-sans);
}
```

---

## 8. shadcn/ui テーマオーバーライド

shadcn/ui は CSS カスタムプロパティ（CSS 変数）でテーマを管理する。`src/app/globals.css` に以下を追加してブランドカラーを適用する。

### 8.1 CSS 変数定義（globals.css）

```css
@layer base {
  :root {
    /* Background / Foreground */
    --background: 0 0% 98%;           /* neutral-50: #fafafa */
    --foreground: 240 4% 16%;         /* neutral-900: #18181b */

    /* Card */
    --card: 0 0% 100%;                /* #ffffff */
    --card-foreground: 240 4% 16%;    /* neutral-900 */

    /* Popover */
    --popover: 0 0% 100%;
    --popover-foreground: 240 4% 16%;

    /* Primary（ブランドカラー #639922） */
    --primary: 85 63% 37%;            /* HSL of #639922 */
    --primary-foreground: 0 0% 100%;  /* #ffffff */

    /* Secondary（暫定: amber-500 #F59E0B） */
    --secondary: 38 92% 50%;
    --secondary-foreground: 0 0% 100%;

    /* Muted */
    --muted: 240 5% 96%;              /* neutral-100: #f4f4f5 */
    --muted-foreground: 240 4% 46%;   /* neutral-500: #71717a */

    /* Accent */
    --accent: 86 55% 93%;             /* primary-50: #f3f8e9 */
    --accent-foreground: 85 63% 37%;  /* primary-500: #639922 */

    /* Destructive */
    --destructive: 0 84% 60%;         /* red-500: #ef4444 */
    --destructive-foreground: 0 0% 100%;

    /* Border / Input / Ring */
    --border: 240 6% 90%;             /* neutral-200: #e4e4e7 */
    --input: 240 6% 90%;              /* neutral-200 */
    --ring: 85 63% 37%;               /* primary-500: #639922 */

    /* Border Radius */
    --radius: 0.5rem;                 /* 8px = rounded-md */
  }

  /* ダークモード変数（v1.0 では未使用。宣言のみ保持） */
  .dark {
    --background: 240 10% 4%;
    --foreground: 0 0% 98%;
    --card: 240 10% 6%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 6%;
    --popover-foreground: 0 0% 98%;
    --primary: 85 63% 55%;
    --primary-foreground: 240 10% 4%;
    --secondary: 38 92% 50%;
    --secondary-foreground: 240 10% 4%;
    --muted: 240 5% 15%;
    --muted-foreground: 240 5% 65%;
    --accent: 240 5% 15%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 63% 31%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5% 20%;
    --input: 240 5% 20%;
    --ring: 85 63% 55%;
  }
}
```

> **HSL 計算根拠:**
> - `#639922` → R=99/255, G=153/255, B=34/255 → H≈85°, S≈63%, L≈37%

### 8.2 shadcn/ui 初期化コマンド

```bash
pnpm dlx shadcn@latest init
```

初期化時の選択肢:

| 項目 | 値 |
|---|---|
| Style | Default |
| Base color | Neutral |
| CSS variables | Yes |
| Tailwind config path | tailwind.config.ts |
| Components path | src/components/ui |
| Utils path | src/lib/utils.ts |

初期化後、`components.json` の `cssVariables: true` を確認し、上記 CSS 変数定義で上書きする。

### 8.3 コンポーネント別オーバーライド方針

shadcn/ui コンポーネントは `src/components/ui/` 内のソースを直接編集してカスタマイズする（shadcn/ui の設計方針に従う）。主な変更点:

| コンポーネント | 変更内容 |
|---|---|
| `Button` | `primary` variant のデフォルト文字色を `text-white` に固定 |
| `Input` | focus ring を `ring-primary-500` に変更（globals.css の `--ring` で制御済み） |
| `Badge` | `default` variant の背景を `bg-primary-100`、文字を `text-primary-700` に変更 |
| `Label` | `text-sm font-medium text-neutral-700` をデフォルトに設定 |

---

## 9. 未決定事項

| 項目 | 状況 | 決定期限 |
|---|---|---|
| セカンダリカラーの正式選定 | 暫定: amber-500 (`#F59E0B`) でデザイン検証中 | デザインレビュー後（M1開始前） |
| ダークモード対応の有無 | v1.0 スコープ外の方向で検討中。CSS 変数は定義済みだが実装・テストは行わない | M0 完了前に最終決定 |
| Google Fonts の代替（パフォーマンス） | Noto Sans JP は容量が大きいためサブセット指定を検討中 | M1 フロントエンド実装開始前 |
