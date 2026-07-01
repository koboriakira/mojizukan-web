# もじずかん Web

Cloudflare Workers + Hono + D1 で構成する、こども向け文字学習 Web アプリ。

## セットアップ

```bash
npm install
npx wrangler d1 migrations apply mojizukan-db --local
npm run dev
```

## ローカル開発コマンド

```bash
npm run dev        # 開発サーバー（ポートはブランチ名から自動決定）
npm run test       # ユニットテスト
npm run test:e2e   # E2E テスト（ローカル）
npm run typecheck  # 型チェック
npm run reset-db   # ローカル DB を初期化
npm run seed       # ローカルにシードデータ投入
```

## 環境構成

wrangler environments（1アカウント方式）で環境を分離している。

| 環境 | Worker | URL | D1 | R2 |
|------|--------|-----|----|----|
| staging | `mojizukan-staging` | `https://mojizukan-staging.private-beats.workers.dev` | `mojizukan-db-staging` | `mojizukan-images-staging` |
| preview | `mojizukan-pre-*` | PR ごとに自動生成 | 使い捨て | 使い捨て |
| root（将来の本番） | `mojizukan` | 未デプロイ | `mojizukan-db` | `mojizukan-images` |

### 原則: ローカルからリモートを触らない

staging へのデプロイ・リセット・マイグレーションはすべて CI（GitHub Actions）経由で行う。
ローカルで `wrangler` を使うのは開発サーバー（`npm run dev`）のみ。

唯一の例外は secrets の設定:

```bash
wrangler secret put GOOGLE_CLIENT_ID --env staging
wrangler secret put GOOGLE_CLIENT_SECRET --env staging
wrangler secret put OPENAI_API_KEY --env staging
```

## CI ワークフロー

| ワークフロー | トリガー | 内容 |
|-------------|---------|------|
| **CI / Deploy** (`deploy.yml`) | push to main, PR | テスト → PR: preview 環境作成 / main: staging デプロイ |
| **Preview Cleanup** (`preview-cleanup.yml`) | PR close | preview の Worker / D1 / R2 を削除 |
| **Migrate Staging** (`migrate-staging.yml`) | 手動 | staging DB にマイグレーションだけ適用 |
| **Reset Environment** (`reset-environment.yml`) | 手動（`reset` 入力で確認） | staging の DB リセット + R2 クリア + シード再投入 |
| **Staging E2E** (`staging-e2e.yml`) | 手動 | staging に対して E2E テストを実行 |

### デプロイフロー

```
feature branch → PR → preview 環境（自動作成、Close で自動削除）
                  ↓ merge
                main → staging 自動デプロイ
```

## ディレクトリ構成

```
src/
  index.ts          # エントリポイント
  client/           # クライアント JS/CSS（TypeScript 文字列定数）
  routes/           # ルートハンドラ
  services/         # ドメインロジック
  middleware/       # Hono ミドルウェア
  types/            # 型定義
  __tests__/        # ユニットテスト
e2e/                # E2E テスト
design/             # Claude Design 連携
docs/               # ドメインドキュメント（グロッサリー・ADR）
migrations/         # D1 マイグレーション（連番）
bin/                # 開発スクリプト（ローカル専用）
public/             # 静的アセット
cache-samples/      # シードデータ（画像・説明文）
```
