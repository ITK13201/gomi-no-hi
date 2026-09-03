## Why

ブラウザコンソールに `AbortError: Registration failed - missing applicationServerKey` が記録されており、`pushManager.subscribe()` に渡す `applicationServerKey` が `undefined` になっていることが判明した。根本原因は**ビルドパイプラインが `VITE_VAPID_PUBLIC_KEY` を Docker ビルドに渡していない**こと：`build.yml` はビルド引数を指定せず、`Dockerfile` も `ARG VITE_VAPID_PUBLIC_KEY` を宣言していないため、`pnpm run build` が `VITE_VAPID_PUBLIC_KEY=undefined` でバンドルされる。結果として `pushManager.subscribe()` が即座に例外を投げ、その後の `fetch('/api/subscribe')` は実行されず、バックエンドへの購読登録が一切届かない。加えて `enable()` にはエラーハンドリングがないため、`setEnabled(true)` 済みの状態が永続化され、フロントエンドは「通知ON」と表示し続ける。

## What Changes

- `frontend/Dockerfile`: `ARG VITE_VAPID_PUBLIC_KEY` を追加し、ビルド時に環境変数として渡す（**根本修正**）。
- `.github/workflows/build.yml`: frontend ビルドステップの `build-args` に `VITE_VAPID_PUBLIC_KEY` を追加（**根本修正**）。
- `enable()` 内のエラーを捕捉し、`pushManager.subscribe()` または `/api/subscribe` フェッチが失敗した場合に `setEnabled(false)` へロールバックする（**再発防止**）。
- `useNotification` フックに `error` 状態（`string | null`）を追加し、呼び出し側がエラーメッセージを表示できるようにする（**再発防止**）。
- 通知設定 UI のページでエラー時にメッセージを表示する（**再発防止**）。

## Capabilities

### New Capabilities

- `notification/subscribe-reliability`: 購読登録フローのエラーハンドリングと状態整合性。`enable()` 失敗時の `enabled` 状態ロールバックと、エラー情報の呼び出し元への伝達を定義する。

### Modified Capabilities

（なし）

## Impact

- `.github/workflows/build.yml`: `build-args` 追加（GitHub Actions Secret `VITE_VAPID_PUBLIC_KEY` の登録が必要）
- `frontend/Dockerfile`: `ARG VITE_VAPID_PUBLIC_KEY` と環境変数注入の追加
- `frontend/src/hooks/useNotification.ts`: try/catch によるエラーハンドリング追加、失敗時に `setEnabled(false)` でロールバック、`error` 状態と `clearError` を返却
- `frontend/src/pages/` 配下の通知設定ページ: `error` を受け取りインラインメッセージを表示
- `frontend/src/store/notificationStore.ts`: 変更なし（エラー状態は hook ローカルで管理）
