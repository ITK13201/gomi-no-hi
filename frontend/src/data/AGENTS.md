# src/data/

地区ごとのごみ収集データを管理するディレクトリ。地区を変更・更新するときは以下3ファイルを編集する。

## ファイル構成

| ファイル | 役割 | 更新頻度 |
|---|---|---|
| `config.ts` | 地区名・連絡先・カレンダー期間 | 年1回（新年度） |
| `schedule.ts` | 収集日データ（全日程） | 年1回（新年度） |
| `wasteTypes.ts` | 品目マスター（色・ラベル・注意事項） | 品目変更時のみ |

---

## config.ts

`REGION_CONFIG` を書き換えるだけでアプリ全体に反映される。

```typescript
export const REGION_CONFIG: RegionConfig = {
  name: '○○市 第N地区',
  district: '第N地区',
  city: '○○市',
  contact: {
    general: '0xx-xxx-xxxx',
    bulky: '0xx-xxx-xxxx',
  },
  calendarPeriod: {
    start: 'YYYY-MM-DD',
    end: 'YYYY-MM-DD',
  },
}
```

---

## schedule.ts — PDF からの生成ルール

収集カレンダー PDF を読み込んで `SCHEDULE` 配列を生成する。

### CollectionDay 型

```typescript
type CollectionDay = {
  date: string      // "YYYY-MM-DD" 形式（ISO 8601）
  types: WasteTypeId[]
}
```

### WasteTypeId の対応表

| カレンダー上の表記 | WasteTypeId |
|---|---|
| 燃えるごみ | `'burnable'` |
| 燃えないごみ | `'nonBurnable'` |
| 古紙類 | `'paper'` |
| ペットボトル | `'petBottle'` |
| びん | `'bottle'` |
| 缶 | `'can'` |
| 古着類（ふるぎ） | `'oldClothes'` |
| 白色トレイ | `'whiteTray'` |
| 危険ごみ | `'hazardous'` |

### 同日複数品目のルール

同じ曜日に複数品目が収集される場合、`types` 配列に並べる。
**びん・古着類・白色トレイ・危険ごみ** は常に同日のため必ずセットにする。

```typescript
{ date: '2026-04-02', types: ['bottle', 'oldClothes', 'whiteTray', 'hazardous'] }
```

**燃えないごみ・古紙類** も常に同日のためセットにする。

```typescript
{ date: '2026-04-06', types: ['nonBurnable', 'paper'] }
```

### 注意点

- 休日でも収集がある場合はそのまま記載する
- 収集なしの日はエントリを追加しない（`types: []` は不要）
- 日付は昇順に並べる（月の切れ目でコメントを入れると読みやすい）
- `SCHEDULE` 末尾の `scheduleMap` と `getCollectionDaysInMonth` は変更不要

### エントリ例

```typescript
// 2026年4月
{ date: '2026-04-01', types: ['burnable'] },
{ date: '2026-04-02', types: ['bottle', 'oldClothes', 'whiteTray', 'hazardous'] },
```

---

## wasteTypes.ts

品目が増減した場合のみ更新する。`WasteTypeId` union 型と `WASTE_TYPES` レコードを同時に変更する。
カラーは Tailwind のバッジクラス（`bgColor`・`textColor`・`borderColor`）とカレンダーバーのインラインスタイル用 hex（`color`）の両方を設定する。

> Tailwind v4 で動的クラス名が使えないため、`color` フィールドの hex 値をカレンダーのバーに使っている。
