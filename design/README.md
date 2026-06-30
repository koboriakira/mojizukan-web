# design/ ディレクトリ

Claude Design と Claude Code の間をつなぐデザイン資産の置き場。

## ディレクトリ構成

```
design/
  *.dc.html              # Claude Design が出力する画面プロトタイプ
  screenshots/            # プロトタイプのスクリーンショット
  briefs/                 # Claude Design に渡す入力（Claude Code が生成・更新）
  decisions/              # Claude Design から受け取る出力（Claude Design に書かせる）
```

## ワークフロー: Design ↔ Code 循環

```
Claude Code が brief を生成/更新
  → ユーザーが Claude Design に brief + 前回の dc.html を貼る
  → Claude Design と対話しながらデザインを詰める
  → Claude Design が dc.html + decisions.md を出力
  → ユーザーが design/ に保存・コミット
  → Claude Code が decisions.md を読んで実装 + E2E 設計
  → 実装中の発見を brief に追記
  → 次のサイクルへ
```

### brief（入力）

- Claude Code が現在の実装状況・技術制約・前回からの変更を構造化したもの
- Claude Design セッション開始時に貼る
- テンプレート: `briefs/_template.md`

### decisions（出力）

- Claude Design セッションの結論を構造化したもの
- ユーザータイプ別フロー、画面状態一覧、却下した案、brief からの変更点を含む
- Claude Design に「このデザインの決定記録を Markdown でまとめて」と頼んで出力させる
- テンプレート: `decisions/_template.md`

### brief が source of truth

- brief は常に「現時点の真実」に更新される
- decisions は各サイクルのスナップショット（履歴）
- Claude Design との対話で brief の前提と異なる決定が出た場合、decisions の「brief からの変更点」に記録される
- Claude Code は次のサイクルでその変更点を brief に反映する

## 既存ファイル（レガシー）

以下のファイルは新ワークフロー導入前に作成されたもの。参照は可能だが、今後は briefs/ と decisions/ を使う。

- `HANDOFF.md`, `HANDOFF-v2.md`: 旧形式のデザインハンドオフ
- `LATEST-SPEC.md`: 最新仕様のスナップショット
- `*-HANDOFF.md`: 機能別ハンドオフ
