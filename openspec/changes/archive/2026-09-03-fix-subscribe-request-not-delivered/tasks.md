## 0. VAPID 公開鍵の本番ビルドへの注入（根本原因の修正）

- [x] 0.1 `frontend/Dockerfile` の `RUN pnpm run build` の前に `ARG VITE_VAPID_PUBLIC_KEY` を追加し、`RUN VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY pnpm run build` に変更する。ローカルで `docker build --build-arg VITE_VAPID_PUBLIC_KEY=dummy .` が成功することを確認する
- [x] 0.2 `.github/workflows/build.yml` の frontend ビルドステップ（`docker/build-push-action`）に `build-args: VITE_VAPID_PUBLIC_KEY=${{ secrets.VITE_VAPID_PUBLIC_KEY }}` を追加する
- [ ] 0.3 GitHub リポジトリの Secrets に `VITE_VAPID_PUBLIC_KEY`（base64url エンコードされた VAPID 公開鍵）を登録し、タグを push して CI ビルドが成功することを確認する

## 1. useNotification フックのエラーハンドリング追加（再発防止）

- [x] 1.1 `useNotification.ts` に `const [error, setError] = useState<string | null>(null)` を追加し、`error` と `clearError` を返り値に加える（`tsc -b` が通ること）
- [x] 1.2 `enable()` の `setEnabled(true)` 以降を try/catch でラップし、catch ブロックで `setEnabled(false)` と `setError('通知の登録に失敗しました。もう一度お試しください。')` を呼ぶ
- [x] 1.3 `fetch('/api/subscribe')` のレスポンスを確認し、`!response.ok` の場合に `throw new Error(response.statusText)` を追加する（非 2xx がエラーとして catch されることを確認）
- [x] 1.4 `enable()` が成功した場合に `setError(null)` をクリアし、再試行成功後にエラーが消えることを確認する

## 2. Settings.tsx でのエラー表示

- [x] 2.1 `useNotification()` の返り値から `error` と `clearError` を受け取るよう `Settings.tsx` を更新し、`tsc -b` が通ること
- [x] 2.2 通知トグルの直下に `{error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}` を追加し、トグルが OFF のままエラーメッセージが表示されることをブラウザで確認する

## 3. 動作確認

- [ ] 3.1 `VITE_VAPID_PUBLIC_KEY` を意図的に空にした開発ビルドで `enable()` を呼び、エラーメッセージが UI に表示され `enabled` が `false` のままであることを確認する（エラーハンドリングの検証）
- [ ] 3.2 本番ビルド（CI 経由）または `VITE_VAPID_PUBLIC_KEY` を正しく設定したローカルビルドで通知を ON にし、バックエンドのアクセスログに POST `/api/subscribe` が記録されることを確認する
