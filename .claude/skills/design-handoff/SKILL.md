# design-handoff

Claude Design セッションの成果物を受領し、Issue 化まで一気通貫で処理する。

## 入力

```
/design-handoff receive <zipファイルパス>
/design-handoff brief [テーマ]
```

---

## receive: Design 成果物の受領 → Issue 化

### ステップ 1: 展開と保存

```bash
unzip -o "<zip>" -d "$SCRATCHPAD/design-output"
```

zip 内の `submission/` から以下を識別し保存する:

| ファイル | 保存先 |
|---------|--------|
| `decisions.md` | `design/sessions/YYYYMMDD_HHmm_decisions.md` |
| `*.dc.html` | `design/`（同名上書き） |

タイムスタンプは直近の brief に合わせる（`design/sessions/` の最新 brief から取得）。

### ステップ 2: decisions の読み込みと構造化

decisions.md の各セクションを抽出する:

| セクション | 抽出内容 |
|-----------|---------|
| §1 brief からの変更点 | 前提変更・新規確定事項 |
| §2 ユーザータイプ別フロー | 各フローのステップ |
| §3 画面 × 状態一覧 | 画面ごとの状態マトリクス |
| §4 却下した案 | 不採用の記録（ADR 候補） |
| §5 未解決事項 | 次回持ち越し・ビジネス判断待ち |

### ステップ 3: 既存 Issue との照合

```bash
gh issue list --state open --limit 50 --json number,title,body
```

decisions の内容と既存 Issue を突合し、3 カテゴリに分類する:

| カテゴリ | 判定基準 | アクション |
|---------|---------|-----------|
| **既存更新** | decisions で要件が明確化・変更された既存 Issue | Issue 本文の更新案を提示 |
| **新規** | decisions に含まれるが Issue がない実装項目 | 新規 Issue 候補 |
| **判断待ち** | §5 でビジネス判断が必要と明記された項目 | ラベルだけ付けて保留 |

### ステップ 4: Issue 分解案の提示

番号付きリストで提示する。各項目に:
- カテゴリ（新規 / 既存更新 / 判断待ち）
- 依存関係（`→ #XX` 形式）
- 即実装可能なら ★ マーク

ユーザーの承認を待つ（自動作成しない）。

### ステップ 5: Issue 作成・更新

承認後に `gh issue create` / `gh issue edit` で処理する。

- ラベル: `enhancement`（デフォルト）
- 本文に decisions のセクション参照を含める（例: `decisions: §2-D`）
- 依存 Issue のリンクを含める

### ステップ 6: クイックウィン実装

★ マーク付きの承認済み項目があれば:
1. worktree でブランチを切る
2. 実装 → テスト → コミット → push → PR 作成
3. Issue 番号を PR に紐づける（`Closes #XX`）

---

## brief: 次セッション用 brief の生成

### ステップ 1: 前回成果物の確認

```bash
ls -t design/sessions/*_decisions.md | head -1
```

最新の decisions を読み、§1（変更点）と §5（未解決事項）を抽出する。

### ステップ 2: 実装状況の把握

前回 decisions 以降の実装進捗を把握する:
- 関連 Issue のステータス（`gh issue list`）
- 関連 PR のマージ状況
- コードの差分（新規画面・API・DB 変更）

### ステップ 3: brief 生成

`design/_templates/brief.md` に基づき生成する。テーマ指定があればそこにフォーカスする。

保存先: `design/sessions/YYYYMMDD_HHmm_brief.md`

### ステップ 4: zip 化

brief + 参照ファイルを zip にまとめる:

```bash
zip -j "design/sessions/YYYYMMDD_HHmm_brief.zip" \
  design/sessions/YYYYMMDD_HHmm_brief.md \
  <前回 decisions> \
  design/*.dc.html \
  docs/glossary.md \
  docs/adr/*.md  # template 除く
```

---

## 原則

- **decisions が source of truth**: 実装判断は decisions のフロー・状態表に基づく。dc.html はビジュアルリファレンスであり、コードの移植元ではない
- **既存 Issue との重複チェック**: 新規作成前に必ず既存 Issue を確認する
- **ユーザー確認を挟む**: Issue 分解案の承認を得てから作成する
- **ADR との一貫性**: decisions の §4（却下した案）が既存 ADR と矛盾しないか確認する。新しい設計判断は ADR 候補として提案する
- **グロッサリー同期**: decisions に新しいドメイン用語があれば `docs/glossary.md` への追加を提案する
