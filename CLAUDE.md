# mojizukan-web

もじずかん Web 版。Cloudflare Workers + Hono + D1 で構成。

## 技術スタック

- **ランタイム**: Cloudflare Workers
- **フレームワーク**: Hono
- **DB**: D1 (SQLite)
- **画像ストレージ**: R2
- **決済**: Stripe チケット制（未実装）
- **言語**: TypeScript

## 開発コマンド（すべてローカル操作）

```bash
npm run dev        # ローカル開発サーバー（ポートはブランチ名から自動決定）
npm run typecheck  # 型チェック
npm run test       # テスト実行
npm run test:e2e   # E2E テスト（ローカル）
npm run test:e2e:staging  # staging 環境に対する E2E テスト
npm run reset-db   # ローカル DB リセット
npm run seed       # ローカルにシードデータ投入
```

staging へのデプロイ・リセット・マイグレーションは CI 経由で行う（ローカルから wrangler でリモートを触らない）。

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
- `src/client/*.ts` に触れるリファクタリング後は、コミット前に `npm run test:e2e` を実行する。TypeScript も unit テストも文字列埋め込み内の変数を検出できないため

## ディレクトリ構成

```
src/
  index.ts          # エントリポイント、アプリ定義
  client/           # クライアント JS/CSS（TypeScript 文字列定数）
  routes/           # ルートハンドラ
  services/         # ドメインロジック（コンテキスト別）
    kotoba-atsume/  # 辞書・語彙・NGワード
    ai-generation/  # AI呼び出し・画像生成・共有キャッシュ
    ohanashi/       # おはなしプロンプト
    account/        # 認証・セッション・チケット
  middleware/       # Hono ミドルウェア
  types/            # 型定義（AppEnv, Bindings のみ。コンテキスト固有型は services/<ctx>/types.ts）
  __tests__/        # Vitest ユニットテスト
e2e/                # Playwright E2E テスト
design/             # Claude Design 連携（詳細は design/README.md）
  *.dc.html         # 画面プロトタイプ（Claude Design 出力）
  sessions/         # セッション記録（YYYYMMDD_HHmm_brief.md / _decisions.md）
  _templates/       # brief / decisions のテンプレート
docs/               # ドメインドキュメント（グロッサリー・ADR・Canvas）
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

## 環境構成

### 開発用ログイン（staging / preview のみ）

`DEV_LOGIN=true` が設定された環境では、以下のルートが有効になる。

- `GET /dev/auto-login?tickets=5` — テストユーザーを自動作成してログイン（チケット数は指定可）
- `GET /dev/auto-logout` — ログアウト

### 環境一覧

wrangler environments で環境を分離する（構成A: 1アカウント方式）。

| 環境 | Worker 名 | D1 | R2 | 用途 |
|------|-----------|----|----|------|
| root（将来の本番） | `mojizukan` | `mojizukan-db` | `mojizukan-images` | 本番用（未デプロイ） |
| staging | `mojizukan-staging` | `mojizukan-db-staging` | `mojizukan-images-staging` | 開発・検証用 |
| preview | `mojizukan-pre-*` | 使い捨て | 使い捨て | PR ごとの一時環境 |

- bindings は環境間で継承されない。各環境で全 bindings を明示定義する
- staging の secrets は `wrangler secret put <KEY> --env staging` で設定する
- main マージで staging に自動デプロイされる
- staging URL: `https://mojizukan-staging.private-beats.workers.dev`

## マイグレーション

```bash
npx wrangler d1 migrations apply mojizukan-db --local  # ローカル適用
```

新しいマイグレーションは `migrations/NNNN_名前.sql` として追加する。staging への適用は CI（`migrate-staging.yml` または `deploy.yml`）で行う。

### DB リセット

```bash
npm run reset-db  # ローカル DB をリセット
```

全テーブルを DROP してマイグレーションを再適用する。staging のリセットは CI の `reset-environment.yml` で行う。

## デザイン連携（Claude Design ↔ Claude Code）

画面のデザイン・要件定義は Claude Design で行い、`design/` ディレクトリで Claude Code と接続する。詳細は `design/README.md` を参照。

### Claude Code の責務

- **brief の生成・zip 化**: Claude Design セッションの前に `design/sessions/YYYYMMDD_HHmm_brief.md` を作成し、参照ファイル（前回 decisions、dc.html、glossary、ADR）と合わせて zip にまとめる。テンプレートは `design/_templates/brief.md`
- **decisions の読み取り**: 実装時に `design/sessions/*_decisions.md` を読み、ユーザータイプ別フローと画面状態一覧に基づいて実装する
- **E2E テストの設計**: decisions のユーザータイプ別フローから E2E テストケースを導出する
- **brief への差分反映**: decisions の「brief からの変更点」を次セッションの brief に反映する
- **デザイン再相談の促し**: 実装中にユーザーフロー・画面遷移・状態管理に大きな変更が必要になった場合、コードで解決する前に Claude Design への再相談をユーザーに提案する。変更内容は `design/sessions/` に追補として記録し、次の brief に反映する

### E2E テストと decisions の対応

decisions のユーザータイプ別フローが E2E テストの骨格になる。新しい decisions がコミットされたら、対応する E2E テストの追加・更新を検討する。

## ドメインドキュメント

ドメイン設計の詳細は `docs/` 以下を参照。機能の提案・命名・仕様議論についても、関連するグロッサリーと ADR を確認すること。

- 用語定義: `docs/glossary.md`
- 設計判断の記録: `docs/adr/`（ADR）— Accepted な ADR で否定された選択肢を再提案しない
- コンテキスト境界: `docs/strategic/context-map.md`
- 各コンテキストの概要: `docs/contexts/<ctx>/canvas.md`
- 集約の不変条件: `docs/contexts/kotoba-atsume/aggregates/zukan-entry.md`

## 開発の進め方

ユーザーからの要望・議論に対して、以下の順序で進める。

1. **docs 更新の要否を判定する** — グロッサリー・ADR・Canvas・集約定義など、ドメインナレッジに影響があるか確認し、先に更新する
2. **要件・受入条件を整理して Issue を作成する** — 実装スコープを明確にする
3. **実装に進む** — docs と Issue が整った状態で着手する

`docs/` 以下のナレッジの更新・最新化を最重要視すること。コードより先にドメインモデルを正しくする。

## spec 駆動開発フロー

### 2-Issue 分離

新規ルート追加・DB スキーマ変更など、契約を先に固定すべき変更は Issue を2つに分ける。

- **Issue A（Spec）** — `.github/ISSUE_TEMPLATE/spec-request.yml` で起票する（`type:spec` ラベル）。「何が欲しいか」を自然言語で記述し、`specs/_template.md` から `specs/<name>.md` を作成する。`status: draft` から人間レビュー（CODEOWNERS）を経て `status: approved` にする
- **Issue B（Implementation）** — `.github/ISSUE_TEMPLATE/implement-spec.yml` で起票する（`type:impl` + `loop:ready` ラベル）。approved 済みの spec を対象に実装する。spec の受け入れシナリオ（`AC-XXX`）をテスト名に含める

### 追加原理

> 契約は検証対象と同じバージョン管理下にスナップショットされて初めて正本たりうる。

spec が Issue の本文やチャットのやりとりに留まっている間は、検証対象（コード）と同じコミット履歴を共有しない。`specs/*.md` としてリポジトリにコミットすることで、はじめて `judges/path-scope.sh` や `judges/spec-traceability.sh` による機械検証の対象になる。

### 逆流経路（A → B → A'）

実装（Issue B）を進める中で spec（Issue A）の記述に誤り・漏れ・矛盾が見つかった場合、実装側で spec を書き換えて押し通さない。

1. spec 修正用の新しい Issue A' を起票する
2. Issue B を `blocked` にする
3. Issue A' が人間レビューを経て spec を修正・承認したら、Issue B の blocked を解除する

詳細は `specs/README.md` を参照。

### spec なし Issue との共存

すべての変更に spec を要求すると開発フローが重くなり過ぎる。以下の基準で spec の要否を判断する。

| 変更の種類 | spec | Issue 構成 |
|-----------|------|-----------|
| バグ修正 | 不要 | Issue B 単独（`bug.yml`） |
| リファクタリング | 不要 | Issue B 単独（`feature.yml`） |
| 新規ルート追加 / migration 追加 | 必須 | Issue A → Issue B |

### ファイルスコープ

- **Spec PR** — `specs/` 配下のみを変更する
- **Impl PR** — `specs/` 以外（`src/`, `migrations/` 等）を変更する。spec とコードを同一 PR に混在させない

`judges/path-scope.sh`（`npm run judges` から実行）がこのスコープ分離を機械検証する。

## Issue 実装フロー

GitHub Issue の機能実装を開始するときは `/dev-pipeline start <Issue番号>` を実行する。
PR 作成前に `/dev-pipeline finish <Issue番号>` を実行してスコープと受入条件を検証する。

## ブランチ運用

- main への直接 push は禁止（GitHub リポジトリルールで強制）
- 変更は必ず PR 経由でマージする
- CI（test ジョブ）が必須ステータスチェック

## デプロイ

main ブランチへのマージで GitHub Actions が staging に自動デプロイする。
手動デプロイはしない（CI 経由のみ）。staging マイグレーション単独実行は `migrate-staging.yml` ワークフローで。

### CI ワークフロー一覧

| ファイル | トリガー | 内容 |
|---------|---------|------|
| `deploy.yml` | push to main / PR | テスト → staging デプロイ（main）/ preview デプロイ（PR） |
| `migrate-staging.yml` | 手動 | staging D1 にマイグレーション単独適用 |
| `reset-environment.yml` | 手動 | staging の DB・R2 をリセット |
| `staging-e2e.yml` | 手動 | staging に対して E2E テストを実行 |
| `preview-cleanup.yml` | PR close | PR 用 preview Worker を削除 |

### 必要なシークレット

- `CLOUDFLARE_API_TOKEN`: GitHub Actions 用（Secrets に設定）
- `CLOUDFLARE_ACCOUNT_ID`: GitHub Actions 用（Secrets に設定）

### AI バインディング

Workers AI を使用（`wrangler.toml` の `[ai]` セクションで設定済み）。
プレビュー・本番デプロイとも API キー不要で動作する。
