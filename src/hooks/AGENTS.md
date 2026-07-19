# src/hooks/

スケジュールデータの取得ロジックをカプセル化するカスタムフック。

## useSchedule.ts

| エクスポート | 返り値 | 概要 |
|---|---|---|
| `useTodaySchedule()` | `WasteTypeId[]` | 今日の収集品目 |
| `useTomorrowSchedule()` | `WasteTypeId[]` | 明日の収集品目 |
| `useWeekSchedule()` | `{ date, dateStr, types }[]` | 今後7日間（収集ありの日のみ） |
| `useMonthSchedule(year, month)` | `CollectionDay[]` | 指定月の全収集日 |

## useNotification.ts

プッシュ通知の有効化・無効化を担うフック。

| エクスポート | 型 | 概要 |
|---|---|---|
| `enabled` | `boolean` | 通知が有効かどうか |
| `permission` | `NotificationPermission` | ブラウザの通知許可状態 |
| `enable()` | `Promise<void>` | 許可要求 → SW 購読 → `/api/subscribe` POST |
| `disable()` | `Promise<void>` | `/api/subscribe` DELETE → SW 購読解除 |

- `enable()` / `disable()` は非同期。呼び出し側は `void` で fire-and-forget するか `await` する。
- VAPID 公開鍵は `import.meta.env.VITE_VAPID_PUBLIC_KEY` から取得（`src/vite-env.d.ts` で型定義済み）。
- `notificationStore` の `setEnabled` / `setPermission` を内部で呼ぶ。ページ側でストアを直接 `setEnabled` してはいけない。

## 規約

- 日付の変換（`Date` → `"YYYY-MM-DD"`）はフック内の `toDateStr` を使う。公開しない。
- `useMemo` の依存配列に `new Date()` を直接入れない（毎レンダーで変わるため）。
