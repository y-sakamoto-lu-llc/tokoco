# アーキテクチャ概要

**サービス名:** Tokoco（トココ）
**バージョン:** 1.0
**作成日:** 2026-03-26
**ステータス:** Draft

---

## システム構成図

```
[ブラウザ]
    │
    ▼
[Cloudflare Pages + Edge Runtime]
    │  Next.js App Router
    │  Route Handlers（API）
    │
    ├──▶ [Google Places API]   店舗情報取得
    │
    └──▶ [Supabase]
            ├── PostgreSQL（Drizzle ORM 経由）
            ├── Auth（JWT セッション）
            ├── Realtime（投票結果のリアルタイム更新）
            └── Storage（店舗写真）
```

---

## Supabase RLS 方針

| テーブル | 方針 |
|---|---|
| profiles | 本人のみ SELECT / UPDATE |
| shops | 本人のみ SELECT / INSERT / UPDATE / DELETE |
| tags | 本人のみ SELECT / INSERT / DELETE |
| shop_tags | 本人のみ SELECT / INSERT / DELETE |
| events | 本人のみ INSERT / UPDATE / DELETE；share_token が一致する場合は全員 SELECT |
| event_shops | events に準ずる |
| votes / vote_choices | share_token 一致で INSERT；オーナーのみ SELECT |
