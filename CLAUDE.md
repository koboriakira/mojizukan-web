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

## テスト方針

トロフィー型（統合テスト重視）を採用する。

| 層 | ツール | 方針 |
|---|---|---|
| 静的解析 | TypeScript | 型チェックで防げるものは型で防ぐ |
| ユニット | Vitest | 純粋ロジックのみ。文字列containチェックでお茶を濁さない |
| 統合 | vitest-pool-workers（D1導入後） | API + D1 を本番同等の workerd で実行。主軸 |
| E2E | Playwright | 重要ユーザーフロー数本。クライアント JS は文字列埋め込みのため、ブラウザ実行でしか検出できないバグがある |

- クライアント JS（`src/client/*.ts`）は TypeScript 文字列定数として定義されている。テンプレートリテラル内の構文エラーや未定義変数は TypeScript もユニットテストも検出できないため、E2E が最後の砦になる
- E2E は `npm run test:e2e` で実行。`wrangler dev` を自動起動して Playwright でブラウザ操作する
- E2E を増やしすぎない。フローの追加は3本を超えたら本当に必要か考える

## ディレクトリ構成

```
src/
  index.ts          # エントリポイント、アプリ定義
  client/           # クライアント JS/CSS（TypeScript 文字列定数）
  routes/           # ルートハンドラ
  __tests__/        # Vitest ユニットテスト
e2e/                # Playwright E2E テスト
migrations/         # D1 マイグレーション（連番）
bin/                # 開発スクリプト
public/             # 静的アセット（音声ファイル等）
```

## ローカル開発のセットアップ

```bash
npm install
npx wrangler d1 migrations apply mojizukan-db --local  # ローカル DB を初期化
npm run dev
```

`wrangler.toml` の `database_id` は本番 D1 の UUID だが、`--local` / `wrangler dev` ではローカル SQLite が使われるため影響しない。

## マイグレーション

```bash
# ローカル適用
npx wrangler d1 migrations apply mojizukan-db --local

# リモート適用（本番）
npx wrangler d1 migrations apply mojizukan-db --remote
```

新しいマイグレーションは `migrations/NNNN_名前.sql` として追加する。

## ブランチ運用

- main への直接 push は禁止（GitHub リポジトリルールで強制）
- 変更は必ず PR 経由でマージする
- CI（test ジョブ）が必須ステータスチェック

## デプロイ

main ブランチへのマージで GitHub Actions が自動デプロイする。
手動デプロイは `npm run deploy`。

### 必要なシークレット

- `CLOUDFLARE_API_TOKEN`: GitHub Actions 用（Secrets に設定）
- `CLOUDFLARE_ACCOUNT_ID`: GitHub Actions 用（Secrets に設定）

### AI バインディング

Workers AI を使用（`wrangler.toml` の `[ai]` セクションで設定済み）。
プレビュー・本番デプロイとも API キー不要で動作する。
