## Purpose

通知の有効化フロー（`enable()`）においてエラーが発生した場合に、フロントエンドの `enabled` 状態とバックエンドの購読登録状態が不整合にならないことを保証し、エラーをユーザーへ伝達できるようにする。

## Requirements

### Requirement: enable() 失敗時に enabled 状態をロールバックする

`enable()` 実行中にプッシュ購読の作成（`pushManager.subscribe()`）またはバックエンドへの購読登録（`POST /api/subscribe`）が失敗した場合、システムは `enabled` を `false` に戻さなければならない（SHALL）。失敗後に `enabled=true` の状態が永続化されてはならない。

#### Scenario: pushManager.subscribe() がエラーになる

- **WHEN** `enable()` 実行中に `pushManager.subscribe()` が例外をスローする
- **THEN** `enabled` は `false` のまま（または `false` に戻る）であり、バックエンドへのリクエストは送信されない

#### Scenario: /api/subscribe へのフェッチがエラーになる

- **WHEN** `enable()` 実行中に `fetch('/api/subscribe')` が失敗する（ネットワークエラー、非 2xx レスポンスを含む）
- **THEN** `enabled` は `false` に戻る

### Requirement: enable() 失敗時にエラーを呼び出し元へ伝達する

`enable()` が失敗した場合、システムは呼び出し元がエラーを検知できるよう、エラー状態を公開しなければならない（SHALL）。エラー状態は文字列メッセージを持ち、呼び出し元がユーザーへ表示できること。

#### Scenario: エラー状態が設定される

- **WHEN** `enable()` が何らかの理由で失敗する
- **THEN** フックが返す `error` 値が `null` でないメッセージ文字列になる

#### Scenario: エラーをクリアできる

- **WHEN** ユーザーまたは UI がエラーのクリアを要求する
- **THEN** `error` は `null` に戻る

### Requirement: 通知設定 UI が enable() のエラーを表示する

通知トグルを ON にしようとして `enable()` が失敗した場合、UI はエラーメッセージをユーザーに表示しなければならない（SHALL）。エラーメッセージはトグル付近のインライン表示とする。

#### Scenario: トグル操作失敗時にエラーが表示される

- **WHEN** ユーザーが通知トグルをタップし、`enable()` が失敗する
- **THEN** 設定画面のトグル近傍に日本語のエラーメッセージが表示される

#### Scenario: 再試行後にエラーが消える

- **WHEN** エラー表示中にユーザーが再度トグルをタップし、`enable()` が成功する
- **THEN** エラーメッセージが消え、通知が有効状態になる
