# テスト戦略

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-30
**ステータス:** Draft

---

## 目次

1. [テスト方針](#1-テスト方針)
2. [テスト層の分類とスコープ](#2-テスト層の分類とスコープ)
3. [テスト対象の優先順位](#3-テスト対象の優先順位)
4. [テストファイルの配置規則](#4-テストファイルの配置規則)
5. [Vitest セットアップ・設定方針](#5-vitest-セットアップ設定方針)
6. [モック戦略](#6-モック戦略)
7. [テストの書き方](#7-テストの書き方)
   - 7.1 Zod スキーマテスト
   - 7.2 Route Handler テスト
   - 7.3 ユーティリティ関数テスト
   - 7.4 コンポーネントテスト
8. [カバレッジ目標](#8-カバレッジ目標)
9. [CI 連携（GitHub Actions との接続点）](#9-ci-連携github-actions-との接続点)
10. [E2Eテスト（v2.0 以降の方針）](#10-e2eテストv20-以降の方針)

---

## 1. テスト方針

### 基本方針

- **テストピラミッド**: ユニットテストを土台とし、統合テスト・E2E テストの順で積み上げる。v1.0 は E2E を行わない。
- **コロケーション**: テストファイルは対象ファイルと同じディレクトリに置く（後述）。
- **実装前に優先順位を確認**: セキュリティに直結するロジック（share_token 検証・クローズ判定・RLS バイパス）を最優先でテストする。
- **Edge Runtime を意識したテスト**: Cloudflare Pages（Edge Runtime）上で動作するため、`crypto`・`fs` 等 Node.js 専用 API への依存を避ける。Vitest は Node.js 環境で実行するが、テスト対象コード自体が Edge Runtime 互換であることを維持する。
- **カバレッジより品質**: カバレッジ数値の追求より、テストケース自体の意味（正常系・異常系・境界値）を重視する。

---

## 2. テスト層の分類とスコープ

| テスト層 | ツール | 対象 | v1.0 |
|---|---|---|---|
| ユニットテスト | Vitest | Zod スキーマ・ユーティリティ関数 | 実施 |
| コンポーネントテスト | Vitest + Testing Library | フォームコンポーネント・UI ロジック | 実施 |
| 統合テスト（Route Handler） | Vitest | Route Handler + DB モック | 実施 |
| E2E テスト | Playwright | 重要ユーザーシナリオ全体 | v2.0 以降 |

### スコープの詳細

#### ユニットテスト

- **Zod スキーマ**: 正常系・異常系の入力値を網羅する。特にセキュリティ要件に関わる制約（パスワード強度・URL スキーム・文字数上限）を明示的にテストする。
- **ユーティリティ関数**: タグ自動削除判定（SHOP-13）・share_token 生成（SEC-07）・価格帯変換（Google `price_level` → 表示ラベル）など、ロジックが独立した純粋関数。

#### コンポーネントテスト

- **フォームコンポーネント**: 認証フォーム（ログイン・サインアップ）・店舗追加フォームのバリデーション表示・送信動作をテストする。
- **インタラクション**: ボタンクリック・フォーム送信・エラーメッセージ表示が要件通りに動作することを確認する。
- **Server Component はテストしない**: データ取得が絡む Server Component はコンポーネントテストの対象外とし、Route Handler テストでロジックをカバーする。

#### 統合テスト（Route Handler）

- Route Handler の正常系・異常系・認可チェックを網羅する。
- Supabase クライアントはモックを使用する（後述）。
- DB との実際の接続は行わない（テスト実行に Supabase 環境を不要にする）。

---

## 3. テスト対象の優先順位

実装時のテスト作成はこの順序で優先する。

### 優先度 1（必須）— セキュリティ・ビジネスロジック直結

| 対象 | 要件ID | テスト種別 |
|---|---|---|
| 投票 Route Handler（share_token 検証・クローズ判定） | VOTE-01・EVENT-10・SEC-07 | 統合テスト（Route Handler） |
| Zod スキーマ全件（auth・shop・tag・event・vote） | SEC-04 | ユニットテスト |
| share_token 生成ロジック（128bit 以上のエントロピー確認） | SEC-07 | ユニットテスト |

### 優先度 2（重要）— コアユーザーシナリオ

| 対象 | 要件ID | テスト種別 |
|---|---|---|
| タグ自動削除ロジック（使用数0のタグを削除する関数） | SHOP-13 | ユニットテスト |
| 店舗登録 Route Handler（認証チェック・バリデーション） | SHOP-01 | 統合テスト（Route Handler） |
| イベント作成 Route Handler（候補店舗の所有権確認） | EVENT-03・EVENT-04 | 統合テスト（Route Handler） |
| 認証フォーム（サインアップ・ログイン）のバリデーション表示 | AUTH-03・SEC-04 | コンポーネントテスト |

### 優先度 3（推奨）— ユーザビリティ

| 対象 | 要件ID | テスト種別 |
|---|---|---|
| 投票フォームコンポーネント（選択・送信・エラー表示） | VOTE-01〜03 | コンポーネントテスト |
| Google Places Route Handler（エラー時のフォールバック） | SHOP-02・SHOP-05 | 統合テスト（Route Handler） |
| 価格帯変換ユーティリティ（price_level → 表示ラベル） | SHOP-04 | ユニットテスト |

---

## 4. テストファイルの配置規則

**コロケーション方式**を採用する。テストファイルは対象ファイルと同一ディレクトリに置き、拡張子を `.test.ts` / `.test.tsx` とする。

```
src/
├── app/
│   └── api/
│       ├── votes/
│       │   ├── route.ts
│       │   └── route.test.ts        <- Route Handler テスト
│       └── shops/
│           ├── route.ts
│           └── route.test.ts
├── lib/
│   └── validations/
│       ├── auth.ts
│       ├── auth.test.ts             <- Zod スキーマテスト
│       ├── shop.ts
│       ├── shop.test.ts
│       ├── vote.ts
│       └── vote.test.ts
└── components/
    └── auth/
        ├── LoginForm.tsx
        └── LoginForm.test.tsx       <- コンポーネントテスト
```

### 命名規則

| ファイル種別 | 命名パターン | 例 |
|---|---|---|
| Route Handler テスト | `route.test.ts` | `src/app/api/votes/route.test.ts` |
| ユニットテスト | `<対象ファイル名>.test.ts` | `src/lib/validations/auth.test.ts` |
| コンポーネントテスト | `<コンポーネント名>.test.tsx` | `src/components/auth/LoginForm.test.tsx` |

---

## 5. Vitest セットアップ・設定方針

### vitest.config.ts の基本設定

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',  // コンポーネントテスト用
    globals: true,         // describe / it / expect をグローバルに使用
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/validations/**',
        'src/lib/utils/**',
        'src/app/api/**',
      ],
      exclude: [
        'src/app/api/**/*.test.ts',
        'src/components/ui/**',  // shadcn/ui はテスト対象外
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### セットアップファイル（src/test/setup.ts）

```typescript
import '@testing-library/jest-dom'

// グローバルモック: crypto.randomUUID（Edge Runtime と同等の振る舞い）
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => '00000000-0000-4000-a000-000000000000',
  },
})
```

### tsconfig.json への追加設定

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

### 必要なパッケージ

```bash
pnpm add -D vitest @vitest/coverage-v8 @vitejs/plugin-react
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D jsdom
```

---

## 6. モック戦略

### Supabase クライアントのモック

Supabase クライアントはテスト環境でモックし、実際の DB 接続を発生させない。

#### モックファイルの配置

```
src/test/
├── setup.ts
└── mocks/
    ├── supabase.ts       # Supabase クライアントモック
    └── drizzle.ts        # Drizzle DB クライアントモック
```

#### Supabase クライアントモック例

```typescript
// src/test/mocks/supabase.ts
import { vi } from 'vitest'

export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }),
}

// テストファイルでの使用例
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => mockSupabaseClient,
}))
```

#### Route Handler でのモック使用パターン

```typescript
// src/app/api/votes/route.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'event-id', closed_at: null },
        error: null,
      }),
    }),
  }),
}))
```

### Drizzle ORM のモック

Drizzle は `vi.mock` でモジュールごとモックする。

```typescript
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
  },
}))
```

### Google Places API のモック

外部 API（Google Places）は `fetch` をモックして偽のレスポンスを返す。

```typescript
// テストファイル内
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    places: [
      {
        id: 'place-id-1',
        displayName: { text: '渋谷スクランブル食堂' },
        formattedAddress: '東京都渋谷区...',
        priceLevel: 'PRICE_LEVEL_MODERATE',
      },
    ],
  }),
}))
```

### Next.js のモック

`NextResponse`・`NextRequest` はモック不要。Vitest 環境でも `next/server` が動作するため、実際のクラスをそのまま使用する。

---

## 7. テストの書き方

### 7.1 Zod スキーマテスト

正常系・異常系・境界値の3パターンを網羅する。

```typescript
// src/lib/validations/auth.test.ts
import { describe, it, expect } from 'vitest'
import { signupSchema } from './auth'

describe('signupSchema', () => {
  describe('正常系', () => {
    it('有効な入力でパースできる', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'Pass1234',
        displayName: 'テストユーザー',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('異常系: email', () => {
    it('メールアドレス形式でない場合エラーになる', () => {
      const result = signupSchema.safeParse({
        email: 'not-an-email',
        password: 'Pass1234',
        displayName: 'テスト',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('email')
      }
    })

    it('空文字の場合エラーになる', () => {
      const result = signupSchema.safeParse({
        email: '',
        password: 'Pass1234',
        displayName: 'テスト',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('異常系: password（AUTH-03）', () => {
    it('7文字以下の場合エラーになる', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'Pass123',  // 7文字
        displayName: 'テスト',
      })
      expect(result.success).toBe(false)
    })

    it('数字を含まない場合エラーになる', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'Password',
        displayName: 'テスト',
      })
      expect(result.success).toBe(false)
    })

    it('英字を含まない場合エラーになる', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: '12345678',
        displayName: 'テスト',
      })
      expect(result.success).toBe(false)
    })
  })
})
```

### 7.2 Route Handler テスト

Route Handler は `Request` オブジェクトを渡して `Response` を受け取る形式でテストする。

```typescript
// src/app/api/events/share/[token]/votes/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

describe('POST /api/events/share/[token]/votes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('有効な share_token でオープン中のイベントに投票できる', async () => {
    // モック: share_token が存在し、イベントがオープン中
    vi.mocked(mockDb.select).mockResolvedValueOnce([
      { id: 'event-id', closedAt: null },
    ])

    const request = new Request('http://localhost/api/events/share/valid-token/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voterName: 'テストゲスト',
        eventShopIds: ['event-shop-id-1'],
      }),
    })
    const response = await POST(request, { params: { token: 'valid-token' } })

    expect(response.status).toBe(201)
  })

  it('クローズ済みイベントへの投票を 410 で拒否する（EVENT-10）', async () => {
    // モック: イベントがクローズ済み
    vi.mocked(mockDb.select).mockResolvedValueOnce([
      { id: 'event-id', closedAt: new Date('2026-01-01') },
    ])

    const request = new Request('http://localhost/api/events/share/closed-token/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voterName: 'テストゲスト',
        eventShopIds: ['event-shop-id-1'],
      }),
    })
    const response = await POST(request, { params: { token: 'closed-token' } })

    expect(response.status).toBe(410)
    const body = await response.json()
    expect(body.code).toBe('event_closed')
  })

  it('存在しない share_token は 404 を返す', async () => {
    // モック: share_token が見つからない
    vi.mocked(mockDb.select).mockResolvedValueOnce([])

    const request = new Request('http://localhost/api/events/share/unknown-token/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voterName: 'テストゲスト',
        eventShopIds: ['event-shop-id-1'],
      }),
    })
    const response = await POST(request, { params: { token: 'unknown-token' } })

    expect(response.status).toBe(404)
  })

  it('バリデーションエラー（voterName が空）は 400 を返す', async () => {
    const request = new Request('http://localhost/api/events/share/valid-token/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voterName: '',  // 必須フィールドが空
        eventShopIds: ['event-shop-id-1'],
      }),
    })
    const response = await POST(request, { params: { token: 'valid-token' } })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('候補店舗が空配列の場合は 400 を返す', async () => {
    const request = new Request('http://localhost/api/events/share/valid-token/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voterName: 'テストゲスト',
        eventShopIds: [],  // VOTE-02: 1件以上必須
      }),
    })
    const response = await POST(request, { params: { token: 'valid-token' } })

    expect(response.status).toBe(400)
  })
})
```

### 7.3 ユーティリティ関数テスト

```typescript
// src/lib/utils/tag.test.ts
import { describe, it, expect } from 'vitest'
import { shouldDeleteTag } from './tag'

describe('shouldDeleteTag（SHOP-13）', () => {
  it('使用店舗数が0のタグは削除対象と判定する', () => {
    expect(shouldDeleteTag({ shopCount: 0 })).toBe(true)
  })

  it('使用店舗数が1以上のタグは削除対象外と判定する', () => {
    expect(shouldDeleteTag({ shopCount: 1 })).toBe(false)
    expect(shouldDeleteTag({ shopCount: 5 })).toBe(false)
  })
})

// src/lib/utils/places.test.ts
import { convertPriceLevel } from './places'

describe('convertPriceLevel', () => {
  it.each([
    ['PRICE_LEVEL_FREE', '〜¥999'],
    ['PRICE_LEVEL_INEXPENSIVE', '¥1,000〜¥2,999'],
    ['PRICE_LEVEL_MODERATE', '¥3,000〜¥5,999'],
    ['PRICE_LEVEL_EXPENSIVE', '¥6,000〜¥9,999'],
    ['PRICE_LEVEL_VERY_EXPENSIVE', '¥10,000〜'],
    [undefined, '価格帯不明'],
    ['PRICE_LEVEL_UNSPECIFIED', '価格帯不明'],
  ])('price_level %s は %s に変換される', (input, expected) => {
    expect(convertPriceLevel(input)).toBe(expected)
  })
})
```

### 7.4 コンポーネントテスト

```typescript
// src/components/auth/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('メールアドレス未入力で送信するとエラーが表示される', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('メールアドレスは必須です')
    })
  })

  it('正しい形式の入力で onSubmit が呼ばれる', async () => {
    const user = userEvent.setup()
    const mockSubmit = vi.fn()
    render(<LoginForm onSubmit={mockSubmit} />)

    await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'Pass1234')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Pass1234',
      })
    })
  })

  it('サーバーエラーをフォームに表示する', async () => {
    const user = userEvent.setup()
    const mockSubmit = vi.fn().mockRejectedValue(new Error('メールアドレスまたはパスワードが間違っています'))
    render(<LoginForm onSubmit={mockSubmit} />)

    await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'WrongPass1')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('メールアドレスまたはパスワードが間違っています')
    })
  })
})
```

---

## 8. カバレッジ目標

### v1.0 のカバレッジ目標

| 対象 | 目標カバレッジ | 理由 |
|---|---|---|
| `src/lib/validations/` | 90% 以上 | Zod スキーマはロジックがシンプルで網羅テストが容易 |
| `src/app/api/` (Route Handler) | 70% 以上 | 正常系・主要異常系をカバーする。細かなエラーハンドリングはログ確認で補完 |
| `src/lib/utils/` | 80% 以上 | 純粋関数が多くテストしやすい |
| `src/components/` | 50% 以上 | フォームコンポーネントを優先。表示専用コンポーネントは対象外でよい |

### 計測コマンド

```bash
pnpm test --coverage
```

CI では coverage レポートを artifact として保存する（#15 GitHub Actions で設定予定）。カバレッジ数値が目標を下回っても **CI を fail させない**（v1.0）。数値はチーム内でレビュー材料として使用する。

---

## 9. CI 連携（GitHub Actions との接続点）

テスト実行は Issue #15（GitHub Actions CI 設定）で自動化する。本設計書ではそこへの接続点を定義する。

### CI でのテスト実行コマンド

```bash
pnpm test --run          # ウォッチモードを無効にして1回だけ実行
pnpm test --coverage     # カバレッジレポートを生成
```

### CI ワークフローとの接続点

```yaml
# .github/workflows/ci.yml（#15 で実装予定）の該当ステップ
- name: Run tests
  run: pnpm test --run

- name: Upload coverage report
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
```

### CI での fail 条件（v1.0）

- テストが1件でも失敗した場合 → CI fail（必須）
- カバレッジが目標を下回った場合 → CI **fail させない**（警告のみ）。カバレッジ強制は v2.0 以降で検討する。

### ローカル開発でのテスト実行

```bash
pnpm test              # ウォッチモード（開発中に常時実行）
pnpm test --run        # 1回だけ実行して終了（CI と同等）
pnpm test --coverage   # カバレッジ付きで実行
```

---

## 10. E2Eテスト（v2.0 以降の方針）

v1.0 では E2E テストは実施しない。v2.0 以降で Playwright を導入し、以下の優先シナリオに適用する。

### 対象シナリオ（優先度順）

| # | シナリオ | 理由 |
|---|---|---|
| E2E-01 | 会員登録 → ログイン → 店舗追加 → ログアウト | コアユーザーシナリオ（AUTH + SHOP） |
| E2E-02 | イベント作成 → 共有リンク発行 → ゲストとして投票 | ゲスト投票はユニットテストでは検証しきれない認証フロー全体をカバー |
| E2E-03 | イベントクローズ後に共有リンクへアクセスすると投票不可になる | EVENT-10・SEC の確認 |
| E2E-04 | パスワードリセットフロー | メールリンク経由のフローはユニットテストでは困難 |

### 技術方針

```
tests/e2e/
├── auth.spec.ts
├── shop.spec.ts
└── vote.spec.ts
```

- Playwright のブラウザ: Chromium（PC）・Mobile Chrome（375px）の2環境を必須とする（UX-01）。
- テスト用 Supabase 環境はステージング環境を使用する（本番環境は使用しない）。
- CI では Pull Request マージ前のゲートとして実行する。
