# ごみの日

越谷市のごみ収集日を確認できる PWA アプリ。収集日の前日夜・当日朝に Push 通知を送信する。

## 機能

- 今日・明日・今後7日間の収集品目を表示
- 月間カレンダーで収集日を確認
- 分別ガイド
- Push 通知（前日夜・当日朝）
- オフライン対応（Service Worker によるキャッシュ）
- iOS / Android ホーム画面インストール対応（PWA）

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React 19 / TypeScript / Tailwind CSS v4 / Vite |
| 状態管理 | Zustand（localStorage 永続化） |
| PWA | vite-plugin-pwa（injectManifest モード）/ Workbox |
| バックエンド | Cloudflare Workers / Hono |
| Push 通知 | Web Push API（VAPID）/ Web Crypto API |
| データストア | Cloudflare KV |
| インフラ | Terraform（cloudflare provider v5） |
| シークレット管理 | 1Password CLI（`op run`） |

## 開発環境のセットアップ

```bash
# direnv + Nix で自動セットアップ（cd するだけ）
npm install
npm run dev
```

## ビルド

```bash
npm run build    # PWA ビルド（dist/）
npm run preview  # 本番ビルドのプレビュー
```

## デプロイ

### PWA（Cloudflare Pages）

GitHub の `main` ブランチに push すると自動でビルド・デプロイされる。

### Workers API

```bash
cd workers && npm run build && cd ..
op run --env-file=terraform/.env.1password -- terraform apply
```

## インフラ構築（初回）

```bash
# 1. VAPID キー生成 → 1Password の gomi-no-hi-vapid に登録
npx web-push generate-vapid-keys

# 2. terraform/backend.hcl を backend.hcl.example からコピーして編集
# 3. terraform/terraform.tfvars を terraform.tfvars.example からコピーして編集

# 4. Terraform 初期化
cd terraform
op run --env-file=.env.1password -- terraform init -backend-config=backend.hcl
op run --env-file=.env.1password -- terraform apply
```

## ディレクトリ構成

```
src/
  components/   UI コンポーネント
  data/         収集日データ・地区設定
  hooks/        カスタムフック（useSchedule / useNotification）
  pages/        ページコンポーネント
  store/        Zustand ストア
  sw.ts         Service Worker（push / notificationclick）
workers/
  src/          Cloudflare Workers API ソース
terraform/      Cloudflare インフラ定義
docs/           設計ドキュメント
```
