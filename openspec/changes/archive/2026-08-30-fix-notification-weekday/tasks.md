## 1. TTL の修正

- [x] 1.1 `backend/internal/service/webpush.go` の `req.Header.Set("TTL", "86400")` を `req.Header.Set("TTL", "28800")` に変更し、`go build ./...` が通ることを確認する

## 2. 曜日計算テストの追加

- [x] 2.1 `backend/internal/service/webpush_test.go` に `TestFormatDateLabel_MultiDays` を追加し、月曜・水曜・土曜・日曜の各日付で正しい曜日文字（月/水/土/日）が返ることを `go test ./internal/service/... -run TestFormatDateLabel` で確認する

- [x] 2.2 `backend/internal/service/webpush_test.go` に `TestToJSTDateStr_Boundary` を追加し、UTC 14:59（JST 23:59）・UTC 15:00（JST 00:00 翌日）・UTC 15:01（JST 00:01 翌日）の 3 パターンで正しい JST 日付文字列が返ることを確認する

- [x] 2.3 `backend/internal/service/webpush_test.go` に `TestRunBatchNotify_DateBoundary` を追加し、JST 深夜 0 時をまたぐ UTC 時刻（`jstHour` = 23/0/1）で `todayStr`・`tomorrowStr` が期待する JST 日付になることをテーブルテストで確認する（`go test ./internal/service/... -run TestRunBatchNotify_DateBoundary`）

## 3. 全テスト通過の確認

- [x] 3.1 `cd backend && go test ./...` を実行してすべてのテストが PASS することを確認する
