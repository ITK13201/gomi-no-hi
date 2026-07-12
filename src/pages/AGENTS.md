# src/pages/

React Router のルートに対応するページコンポーネント。

## ルート対応表

| ファイル | パス | 概要 |
|---|---|---|
| `Home.tsx` | `/` | 今日・明日・今後7日間の収集表示 |
| `Calendar.tsx` | `/calendar` | 月間カレンダー（日付クリックで詳細） |
| `Guide.tsx` | `/guide` | 分別ガイド（アコーディオン） |
| `Settings.tsx` | `/settings` | 地区情報・通知設定・バージョン表示 |

## ページの構造パターン

各ページは以下の構造に従う。

```tsx
<div className="flex flex-col min-h-screen bg-gray-50">
  {/* ヘッダー: bg-green-600 + safe-top でステータスバーに色を付ける */}
  <header className="bg-green-600 text-white safe-top">
    <div className="px-4 pt-4 pb-3">...</div>
  </header>

  {/* コンテンツ: pb-nav でボトムナビと重ならないようにする */}
  <main className="flex-1 px-4 py-4 pb-nav">...</main>
</div>
```

## バージョン表示

`Settings.tsx` で `__APP_VERSION__`（`vite.config.ts` の `define` で注入）を参照している。
型定義は `src/vite-env.d.ts` にある。`package.json` の `version` フィールドと連動する。
