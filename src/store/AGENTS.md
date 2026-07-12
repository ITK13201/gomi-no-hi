# src/store/

Zustand によるグローバル状態管理。

## notificationStore.ts

通知設定を `localStorage` に永続化する（`persist` ミドルウェア使用）。

| State | 型 | 初期値 |
|---|---|---|
| `enabled` | `boolean` | `false` |
| `eveningHour` | `number` | `20` |
| `morningHour` | `number` | `7` |

## 規約

- ストアは `use〇〇Store` という名前にする
- `persist` を使う場合は `name` キーを明示する（localStorage のキー名になる）
- アクションは `set〇〇` という名前にする
