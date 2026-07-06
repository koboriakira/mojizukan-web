# AI エージェント開発ガイド

このリポジトリの開発は AI エージェント（Claude Code）で回す。このドキュメントは**半年後に開発フローを忘れた自分**が、ここだけ読めば AI エージェント開発に復帰できるように書いてある。

エージェント自身への規約は [CLAUDE.md](CLAUDE.md)（技術スタック・テスト方針・ブランチ運用）にある。このドキュメントは人間側の操作マニュアル。

## 全体像: 3つの開発モード

| モード | 使いどころ | 入口 | 人間がやること |
|--------|-----------|------|---------------|
| 1. 対話開発 | 設計判断が多い機能、探索的な作業、ドメインモデルに触る変更 | ターミナルで `claude` を起動 | セッションに付き合う |
| 2. 自律ループ（dev-loop） | 要件が issue に書き切れる実装タスク | issue に `loop:ready` ラベル | issue を書く・質問に答える・PR をレビューする |
| 3. デザイン連携 | 画面・UX・ユーザーフローを決める | `/design-handoff brief` | Claude Design と対話する |

迷ったら: **要件を issue に書き切れるなら dev-loop、書きながら考えたいなら対話開発**。画面の見た目やフローが未確定なら先にデザイン連携。

どのモードでも最後は PR になり、CI（typecheck + vitest + Playwright E2E）が通って人間が merge すると staging に自動デプロイされる。main への直接 push は禁止（リポジトリルールで強制）。

## モード1: 対話開発（基本形）

```bash
cd ~/git/mojizukan-web
claude
```

進め方は CLAUDE.md の「開発の進め方」に従う。要点だけ:

1. **docs が先**: グロッサリー・ADR・Canvas に影響する変更は、コードより先に `docs/` を更新する
2. **Issue 実装は `/dev-pipeline start <Issue番号>`** で開始する。要件抽出とテストスケルトン生成まで自動でやってくれる
3. 実装は TDD（テスト → 実装 → リファクタリング）
4. **PR 前に `/dev-pipeline finish <Issue番号>`** でスコープ逸脱と受入条件をチェックする

並列で複数ブランチを進めたいときは worktree を使う（CLAUDE.md「worktree 並列開発」参照）:

```bash
bash bin/worktree-setup.sh feat/xxx
cd ../mojizukan-web-feat-xxx && npm run dev   # ポートはブランチ名から自動決定
```

## モード2: dev-loop（自律開発ループ）

issue を書いてラベルを付けるだけで、エージェントが実装して PR を作る。人間はセッションに付き合わず、GitHub（スマホ可）だけで関与する。

### 日常の使い方

1. **issue を書く**。いつもの構造化フォーマット（概要 / 背景 / 実装内容）で、受入条件があるとなおよい。「1つの PR としてレビューできる粒度」に収める。大きすぎるなら issue を分割する
2. **本文を読んでから `loop:ready` ラベルを付ける**。このリポジトリは public なので、ラベル付けは「承認者が本文を読んで実行を保証した」という意味を持つ。自分が書いていない issue に付けるときは本文を熟読すること（本文はそのままエージェントへの指示になる）
3. **ループセッションを起動する**（起動していなければ）:
   ```bash
   cd ~/git/mojizukan-web
   claude
   > /dev-loop start
   ```
   起動したら放置してよい。ターミナルは開けたままにする（Mac がスリープしても壊れない。復帰後に続きから検知する）
4. **通知（スマホ push）が来たら対応する**:

   | 通知のラベル | 意味 | やること |
   |-------------|------|---------|
   | `loop:needs-answer` | エージェントが仕様で詰まった | issue に**コメントで回答**する（チェックボックス不要、自由記述でよい）。約1分で自動再開する |
   | `loop:in-review` | PR ができた | PR をレビューして merge する。`Closes #N` で issue も自動で閉じる |
   | `loop:needs-human` | 3回失敗 or 異常 | issue のスレッド（AI のコメント）を読んで原因を判断する。再挑戦させるなら `loop:ready` を付け直す |

5. merge したら staging に自動デプロイされる。以上でループ1周

### ラベルの意味（状態機械）

```
loop:ready ──claim──► loop:wip ──PR作成──► loop:in-review ──人間がmerge──► closed
                        │  ▲
        質問して停止 ──┘  └── 回答を検知して再開
                     loop:needs-answer
                        │
     3回失敗・異常 ──► loop:needs-human（人間が判断して ready に戻す）
```

| ラベル | 付けるのは | 意味 |
|--------|-----------|------|
| `loop:ready` | **人間だけ** | 着手してよい（信頼ゲート） |
| `loop:wip` | エージェント | 作業中（常に高々1件） |
| `loop:needs-answer` | エージェント | 質問への回答待ち |
| `loop:in-review` | エージェント | PR レビュー待ち |
| `loop:needs-human` | エージェント | エスカレーション |

エージェント以外がラベルを `wip` 等に手で変えないこと。唯一の例外は `needs-human → ready`（再挑戦の指示）。

### 仕組み（思い出し用の最小限）

- **状態はすべて GitHub にある**（ラベル = 状態、issue コメント = 経緯、ブランチ `loop/issue-N` = 作業）。ローカルにもセッションにも状態はないので、**セッションはいつ殺しても安全**。復帰は `/dev-loop start` を打ち直すだけ
- 待機はシェルのポーラー（`~/.claude/scripts/dev-loop-wait.sh`）が担い、待機中のトークン消費はゼロ。検知するとセッションが起きて worktree 隔離のサブエージェントが実装する
- 通知は [.github/workflows/loop-notify.yml](.github/workflows/loop-notify.yml) が担う。対象ラベルが付くと Actions が @koboriakira メンションコメントを打ち、GitHub Mobile に push が届く（自分の操作は自分に通知されないため、この迂回が必要）
- 同一 issue の試行は3回まで。超えると `loop:needs-human` に落ちて止まる（無限リトライしない）
- エージェントの詳細プロトコルは `~/.claude/skills/dev-loop/SKILL.md`、設計判断の全記録は Obsidian Vault の `ADR/0002-github-driven-dev-loop-mvp` にある

### トラブルと復帰

| 症状 | 対応 |
|------|------|
| ループセッションを閉じてしまった / Mac を再起動した | 何も壊れていない。`cd ~/git/mojizukan-web && claude` → `/dev-loop start`。放置中の作業があれば、どのセッションでも起動時に `[dev-loop-sweep]` が一覧を教えてくれる |
| 通知が来ない | リポジトリの Watch が「Ignoring」になっていないか、GitHub Mobile の通知設定（Participating and @mentions）を確認。テストは適当な issue に `loop:needs-answer` を付けて確認（終わったら外す） |
| `loop:wip` のまま動いていない | セッション死の可能性。次の `/dev-loop start` が検知して `loop:needs-human` に退避させる。スレッドを読んで `loop:ready` を付け直せば再開 |
| 回答したのに再開しない | 回答は**承認者本人のコメント**しか拾わない（第三者・Bot は無視される仕様）。ポーラーが動いているかセッションを確認 |
| 挙動がおかしい・全部止めたい | ループセッションで `/dev-loop stop`。状態は GitHub に残るのでいつでも再開できる |

## モード3: デザイン連携（Claude Design ↔ Claude Code）

画面・UX・ユーザーフローの決定は Claude Design で行い、`design/` ディレクトリで Code 側と接続する。詳細は [design/README.md](design/README.md)。

```
/design-handoff brief [テーマ]   # brief + 参照ファイルを zip 化 → Claude Design にアップロード
（Claude Design と対話してデザインを確定）
/design-handoff receive <zip>    # decisions を受領 → design/sessions/ に保存 → issue 化
```

decisions のユーザータイプ別フローが E2E テストの骨格になる。issue 化まで済めば、あとはモード1か dev-loop で実装する。

## 補助: ask-human（外出先からの承認チャネル）

対話開発の途中でエージェントが人間の判断（承認 / 選択 / 修正指示）を必要とすると、`koboriakira/decisions` リポジトリに判断 issue が立ち、スマホに通知が来る。チェックボックスをタップするかコメントを書けば、元のセッションが約1分で自動再開する。dev-loop と同じ待機基盤で動いている。

## 環境とデプロイ

### staging 環境

- URL: `https://mojizukan-staging.private-beats.workers.dev`
- main マージで自動デプロイされる（手動デプロイ禁���）
- 開発用ログイン（`DEV_LOGIN=true` のとき有効）:
  - `/dev/auto-login?tickets=5` でテストユーザー作成＋ログイン
  - `/dev/auto-logout` でログアウト

### CI ワークフロー

| ファイル | トリガー | 内容 |
|---------|---------|------|
| `deploy.yml` | push to main / PR | テスト → staging デプロイ（main）/ preview デプロイ（PR） |
| `migrate-staging.yml` | 手動 | staging D1 にマイグレーション単独適用 |
| `reset-environment.yml` | 手動 | staging の DB・R2 をリセット |
| `staging-e2e.yml` | 手動 | staging に対して E2E テストを実行 |
| `preview-cleanup.yml` | PR close | PR 用 preview Worker を削除 |

### staging E2E テスト

ローカル E2E（`npm run test:e2e`）に加えて、staging 環境に対する E2E を実行できる:

```bash
npm run test:e2e:staging   # staging 環境に対して Playwright を実行
```

CI からは `staging-e2e.yml` ワークフローを手動トリガーする。

## 半年後の復帰チェックリスト

環境が生きているかを上から順に確認する。dev-loop の実行基盤は**このリポジトリではなく `~/.claude`**（ホームの Claude Code 設定）にあることに注意。

```bash
# 1. GitHub CLI が認証済みか
gh auth status

# 2. dev-loop の実行基盤があるか（~/.claude 側）
ls ~/.claude/scripts/dev-loop-wait.sh ~/.claude/scripts/dev-loop-sweep.sh ~/.claude/skills/dev-loop/SKILL.md

# 3. ポーラーのセルフテスト（オフラインで動く）
bash ~/.claude/scripts/tests/dev-loop-wait-test.sh   # PASS=14 FAIL=0 なら健全

# 4. ラベル5種が生きているか
gh label list --repo koboriakira/mojizukan-web --search "loop:"

# 5. 通知ワークフローが main にあるか
ls .github/workflows/loop-notify.yml

# 6. ローカル開発環境
npm install
npx wrangler d1 migrations apply mojizukan-db --local
npm run dev
```

3 が失敗する、または `~/.claude` 自体がない場合（新マシン等）は、Vault の `ADR/0002-github-driven-dev-loop-mvp` と `Session/2026/07/20260704_GitHub駆動自律開発ループ設計とMVP実装` に設計と実装の全記録があるので、そこから再構築できる。

最後に通知の実機テスト（適当な issue に `loop:needs-answer` を付けてスマホに届くか）をしてから実運用に戻ること。通知だけはコマンドで検証できない。

## 参照先一覧

| 場所 | 内容 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | エージェント向け規約（技術スタック・テスト方針・worktree・ブランチ運用） |
| [docs/](docs/) | ドメイン知識（glossary / ADR / context-map / canvas）。**コードより先にここを正しくする** |
| [design/README.md](design/README.md) | Claude Design 連携の詳細 |
| `.claude/skills/dev-pipeline/` | Issue 実装パイプライン（start / finish）の定義 |
| `.claude/skills/design-handoff/` | デザイン受領フローの定義 |
| `~/.claude/skills/dev-loop/SKILL.md` | dev-loop オーケストレーターの詳細プロトコル（リポジトリ外） |
| `~/.claude/skills/ask-human/SKILL.md` | 判断チャネルの定義（リポジトリ外） |
| Vault: `ADR/0002-github-driven-dev-loop-mvp` | dev-loop の設計判断（なぜこの形か） |
