# design/ ディレクトリ

Claude Design と Claude Code の間をつなぐデザイン資産の置き場。

## ディレクトリ構成

```
design/
  *.dc.html              # Claude Design が出力する画面プロトタイプ
  screenshots/            # プロトタイプのスクリーンショット
  sessions/               # Claude Design セッションの記録（brief + decisions）
  _templates/             # brief / decisions のテンプレート
```

## ワークフロー: Design ↔ Code 循環

```
Claude Code が brief を生成/更新
  → ユーザーが Claude Design に brief + 前回の dc.html を貼る
  → Claude Design と対話しながらデザインを詰める
  → Claude Design が dc.html + decisions.md を出力
  → ユーザーが design/ に保存・コミット
  → Claude Code が decisions.md を読んで実装 + E2E 設計
  → 実装中の発見を次の brief に反映
  → 次のサイクルへ
```

## sessions/ の命名規則

1回の Claude Design セッション = 1組の brief + decisions。

```
sessions/
  YYYYMMDD_HHmm_brief.md
  YYYYMMDD_HHmm_decisions.md
```

1つのセッションが複数テーマを扱うことがある。テーマはファイルの中に記載する。テーマで探したい場合は grep する。

### brief（入力）

- Claude Code が現在の実装状況・技術制約・前回からの変更を構造化したもの
- Claude Design セッション開始時に貼る
- テンプレート: `_templates/brief.md`

### decisions（出力）

- Claude Design セッションの結論を構造化したもの
- ユーザータイプ別フロー、画面状態一覧、却下した案、brief からの変更点を含む
- Claude Design に「このデザインの決定記録を Markdown でまとめて」と頼んで出力させる
- テンプレート: `_templates/decisions.md`

### brief が source of truth

- 最新の brief が「現時点の真実」
- decisions は各セッションのスナップショット（履歴）
- Claude Design との対話で brief の前提と異なる決定が出た場合、decisions の「brief からの変更点」に記録される
- Claude Code は次の brief を生成するときにその変更点を反映する

## 既存ファイル（レガシー）

以下のファイルは新ワークフロー導入前に作成されたもの。参照は可能だが、今後は sessions/ を使う。

- `HANDOFF.md`, `HANDOFF-v2.md`: 旧形式のデザインハンドオフ
- `LATEST-SPEC.md`: 最新仕様のスナップショット
- `*-HANDOFF.md`: 機能別ハンドオフ
