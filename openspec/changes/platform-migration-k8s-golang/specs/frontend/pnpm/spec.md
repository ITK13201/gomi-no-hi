## Purpose

フロントエンドの依存関係管理を npm から pnpm に移行し、インストール速度の向上と lockfile の決定論的な再現性を確保する。

## ADDED Requirements

### Requirement: pnpm による依存関係管理
フロントエンドプロジェクトは pnpm を使って依存関係を管理しなければならない（SHALL）。`package-lock.json` は削除され、`pnpm-lock.yaml` が単一の lockfile となる。

#### Scenario: 依存関係インストール
- **WHEN** `pnpm install` を実行する
- **THEN** `node_modules` が `pnpm-lock.yaml` に基づいて再現可能な形でインストールされる

#### Scenario: npm install の拒否
- **WHEN** `npm install` を実行する
- **THEN** `.npmrc` の `engine-strict` または `packageManager` フィールドにより警告または失敗する（SHALL）

### Requirement: pnpm workspace 対応
ルートの `package.json` に `"packageManager": "pnpm@<version>"` を定義しなければならない（SHALL）。

#### Scenario: packageManager フィールド確認
- **WHEN** `package.json` を参照する
- **THEN** `"packageManager"` フィールドに pnpm のバージョンが明記されている

### Requirement: ビルドコマンドの互換性維持
pnpm 移行後も既存のビルドスクリプト（`dev`・`build`・`preview`）が同一のコマンド名で動作しなければならない（SHALL）。

#### Scenario: pnpm run build
- **WHEN** `pnpm run build` を実行する
- **THEN** `tsc -b && vite build` が正常に完了し `dist/` が生成される
