## Why

プッシュ通知のメッセージ本文に含まれる曜日が、ユーザーの受信タイミングによって実際の日付と食い違うことがある。原因として、Web Push の TTL が 86400 秒（24 時間）と長すぎるため、通知がキューに入った後に遅延配信された場合、「今日（月）」と書かれた通知が翌日（火曜日）に届くケースが生じうる。また、「明日」通知で使う `tomorrowStr` の計算（`now.Add(24 * time.Hour)`）は固定 +9h オフセット（JST）では正しいが、明示的なテストカバレッジが不足しており、将来的なリグレッションリスクがある。

## What Changes

- Web Push リクエストの TTL を 86400 秒から収集ステータスが変わらない範囲の最大値（8 時間）に短縮し、古い通知が翌日以降に届くのを防ぐ。
- 通知本文の曜日ラベル生成（`formatDateLabel`）に対して、日付境界付近（JST 深夜 0 時前後の UTC 時刻）を含む複数日付のテストケースを追加し、常に正しい曜日が返ることを保証する。
- 「今日」通知・「明日」通知それぞれの `todayStr`/`tomorrowStr` 計算に対して、JST 日付境界をまたぐ UTC 時刻での動作を確認するテストを追加する。

## Capabilities

### New Capabilities

- `notification/push-ttl`: Web Push 通知の TTL ポリシー。配信期限を超えた通知は送信せず、陳腐化した曜日情報が届かないことを保証する。

### Modified Capabilities

（なし）

## Impact

- `backend/internal/service/webpush.go`: TTL ヘッダー値の変更（`"86400"` → `"28800"`）。
- `backend/internal/service/webpush_test.go` および `backend/internal/service/notify_test.go`（新規）: 曜日計算・日付計算のテストを追加。
- ユーザー影響: 深夜以降に遅延配信されていた古い通知がキャンセルされるため、誤った曜日表示が解消される。
