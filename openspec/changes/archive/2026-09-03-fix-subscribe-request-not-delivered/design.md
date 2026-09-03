## Context

ブラウザコンソールのエラー `AbortError: Registration failed - missing applicationServerKey` により、`import.meta.env.VITE_VAPID_PUBLIC_KEY` が `undefined` であることが確定した。`build.yml` は `build-args` を渡しておらず、`Dockerfile` も `ARG VITE_VAPID_PUBLIC_KEY` を宣言していない。サーバーアクセスログへの不在（`/api` ルーティングは動作確認済み）と合わせ、フロントエンドが `fetch()` を呼ぶ前に例外で終了していると確定した。

`useNotification.ts` の `enable()` はこの例外を try/catch しないため、`setEnabled(true)` 済みの状態が localStorage に残り続ける。

詳細な動機は proposal.md を参照。

## Goals / Non-Goals

**Goals:**
- `enable()` の失敗時に `setEnabled(false)` でロールバックし、フロントエンドとバックエンドの状態を一致させる
- エラーメッセージを呼び出し元に伝え、設定 UI で表示する
- 既存の正常系フロー（enable / disable / morningHour・eveningHour 変更）を壊さない

**Non-Goals:**
- 失敗した購読を自動リトライする（ユーザーが再タップで再試行できれば十分）
- バックエンドのエラーレスポンス内容をパースして詳細メッセージを出す
- アプリ起動時に既存購読の有効性を検証して自動再登録する

## Decisions

### VAPID 公開鍵の注入方式: ビルド時 ARG を選択

`VITE_*` 変数は Vite がビルド時にバンドルへ埋め込む。選択肢：

- **ビルド時 ARG（採用）**: `Dockerfile` に `ARG VITE_VAPID_PUBLIC_KEY` を追加し、CI の `build-args` で注入。VAPID 公開鍵はキーローテーション以外で変わらないため、イメージへの埋め込みで十分。
- **ランタイム API injection**: `GET /api/config` を新設してフロントが取得する方法。フロントの購読フローに非同期フェッチが増えて複雑になる。現状の問題規模に対してオーバーエンジニアリング。

**Git 管理**: VAPID 公開鍵は「公開鍵」であり秘密情報ではないが、GitHub Actions Secret 経由で渡す（値のソース管理を一元化するため）。

### エラー状態を hook のローカル `useState` で管理する

`notificationStore`（zustand）にエラーを追加しない。エラーは一時的な UI 状態であり、ページをまたいで共有する必要がない。`useNotification` 内の `useState<string | null>` で十分。

**代替案**: zustand に `error` フィールドを追加 → 永続化 middleware と噛み合わせるとリロード後もエラーが残り、UX が悪化する。

### `enable()` を try/catch でラップし、失敗時に `setEnabled(false)` を呼ぶ

`setEnabled(true)` を try ブロックの先頭に置き（既存挙動を維持）、catch ブロックで `setEnabled(false)` にロールバック + `setError(message)` を呼ぶ。

```typescript
async function enable() {
  // ...permission check...
  setEnabled(true)   // 先に true にして UI をレスポンシブに
  try {
    const subscription = await registration.pushManager.subscribe({...})
    await fetch('/api/subscribe', {...})
    // 非 2xx は手動でエラー扱い
  } catch (e) {
    setEnabled(false)
    setError('通知の登録に失敗しました。もう一度お試しください。')
  }
}
```

**代替案**: `setEnabled(true)` をフェッチ成功後に移動 → トグル操作後にローディング中も OFF のままとなり、フィードバックが遅い。楽観的 UI（先に true）の方が UX が良い。

### 非 2xx レスポンスを例外として扱う

`fetch` は 4xx/5xx でも resolve する。`response.ok` を確認し、false の場合は `throw new Error(response.statusText)` して catch に落とす。

### `Settings.tsx` でエラーをインライン表示する

トグルのすぐ下に `{error && <p className="text-xs text-red-400 ...">…</p>}` を追加する。専用トーストコンポーネントは存在しないため、既存の `!notificationSupported` 表示と同じパターンを流用する。

## Risks / Trade-offs

- **楽観的 UI のちらつき**: `setEnabled(true)` → 失敗 → `setEnabled(false)` でトグルが一瞬 ON になってから OFF に戻る。許容範囲とする（失敗は稀なケース）。
- **`pushManager.subscribe()` が既存購読を返す場合**: subscribe は既存購読があればそのまま返す。VAPID キーが変わった場合は新規購読を作成するが、一部ブラウザでは古い購読を削除してから再作成するためエラーになる可能性がある。この修正でそのエラーも catch されユーザーに通知される。

## Migration Plan

1. `Dockerfile` と `build.yml` を修正してビルドアーティファクトに公開鍵を注入する（先に実施）。
2. GitHub Actions Secret `VITE_VAPID_PUBLIC_KEY` を登録する。
3. `useNotification.ts` と `Settings.tsx` のエラーハンドリングを追加する。
4. タグを push し、CI ビルドが成功することを確認したあとデプロイする。

バックエンドへの変更は不要。ロールバックは revert + 再ビルドで対応可能。既存の localStorage に `enabled=true` が残っているユーザーは、次回 enable 操作時から新しいエラーハンドリングが適用される。
