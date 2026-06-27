# mojizukan-web

もじずかん Web 版。Cloudflare Workers + Hono + D1 で構成。

## 技術スタック

- **ランタイム**: Cloudflare Workers
- **フレームワーク**: Hono
- **DB**: D1 (SQLite)
- **画像ストレージ**: R2（未実装）
- **決済**: Stripe チケット制（未実装）
- **言語**: TypeScript

## 開発コマンド

```bash
npm run dev        # ローカル開発サーバー（ポートはブランチ名から自動決定）
npm run typecheck  # 型チェック
npm run test       # テスト実行
npm run deploy     # 本番デプロイ
```

## worktree 並列開発

ブランチごとに独立した worktree を作り、並列で開発する。

```bash
# worktree を作成（npm install まで自動実行）
bash bin/worktree-setup.sh feat/image-generation

# 開発サーバー起動（ポートは自動割り当て）
cd ../mojizukan-web-feat-image-generation
npm run dev
```

### ポート管理

`bin/dev.sh` がブランチ名のハッシュからポートを自動算出する。

| ブランチ | ポート |
|---------|--------|
| main | 8787（固定） |
| その他 | 8788〜8887（ブランチ名のハッシュ） |

手動でのポート管理は不要。衝突する確率は低いが、もし起きたら `npm run dev -- --port 8900` で上書きできる。

### worktree の後片付け

```bash
git worktree remove ../mojizukan-web-feat-xxx
```

## ディレクトリ構成

```
src/
  index.ts          # エントリポイント、アプリ定義
  routes/           # ルートハンドラ
migrations/         # D1 マイグレーション（連番）
bin/                # 開発スクリプト
```

## マイグレーション

```bash
# ローカル適用
npx wrangler d1 migrations apply mojizukan-db --local

# リモート適用（本番）
npx wrangler d1 migrations apply mojizukan-db --remote
```

新しいマイグレーションは `migrations/NNNN_名前.sql` として追加する。

## デプロイ

main ブランチへの push で GitHub Actions が自動デプロイする。
手動デプロイは `npm run deploy`。

### 必要なシークレット

- `CLOUDFLARE_API_TOKEN`: GitHub Actions 用（Secrets に設定）
- `OPENAI_API_KEY`: Workers 用（`npx wrangler secret put OPENAI_API_KEY`）
