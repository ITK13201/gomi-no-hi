# src/components/

再利用可能な UI コンポーネント。ページ固有のロジックは `src/pages/` に置く。

## コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `WasteBadge` | 品目バッジ（色付きピル）。`size` prop で sm/md/lg を切り替え |
| `TodayCard` | 今日・明日カード。日付・曜日・品目バッジを表示 |
| `WeeklySchedule` | 今後7日間の収集リスト |
| `BottomNav` | 固定ボトムナビゲーション（iOS Safe Area 対応） |

## Tailwind v4 — 動的クラス名禁止

**品目カラーはインラインスタイルで指定する。** `WASTE_TYPES[id].color`（hex）を `style={{ backgroundColor }}` に渡す。
バッジのクラス（`bgColor`・`textColor`・`borderColor`）は `wasteTypes.ts` に静的文字列として定義済みのため直接使用してよい。

```tsx
// カレンダーバー（動的なので style を使う）
<div style={{ backgroundColor: WASTE_TYPES[t].color }} />

// バッジ（静的クラス文字列なので className に使える）
<span className={`${waste.bgColor} ${waste.textColor} ${waste.borderColor}`} />
```

## iOS Safe Area

BottomNav は `h-nav`（`calc(4rem + env(safe-area-inset-bottom))`）を使う。
コンテンツエリアの末尾には `pb-nav` を付けてナビと重ならないようにする。
`safe-top` / `safe-bottom` ユーティリティは `src/index.css` に定義済み。
