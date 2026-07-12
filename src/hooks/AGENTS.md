# src/hooks/

スケジュールデータの取得ロジックをカプセル化するカスタムフック。

## useSchedule.ts

| エクスポート | 返り値 | 概要 |
|---|---|---|
| `useTodaySchedule()` | `WasteTypeId[]` | 今日の収集品目 |
| `useTomorrowSchedule()` | `WasteTypeId[]` | 明日の収集品目 |
| `useWeekSchedule()` | `{ date, dateStr, types }[]` | 今後7日間（収集ありの日のみ） |
| `useMonthSchedule(year, month)` | `CollectionDay[]` | 指定月の全収集日 |

## 規約

- 日付の変換（`Date` → `"YYYY-MM-DD"`）はフック内の `toDateStr` を使う。公開しない。
- `useMemo` の依存配列に `new Date()` を直接入れない（毎レンダーで変わるため）。
