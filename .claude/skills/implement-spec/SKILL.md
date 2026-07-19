---
name: implement-spec
description: approved 済みの spec を参照し、実装 Issue を作成する（Phase B）
argument-hint: "<spec Issue番号 or spec ファイルパス>"
---

# implement-spec（Phase B: 発注）

approved 済みの spec を受け取り、実装の Issue を起票する。

## 前提

- 対象 spec の `status` が `approved` であること（draft のままなら Phase A に差し戻す）
- 実装 Issue は spec の受け入れシナリオをそのまま完了条件に使う
- 1 spec = 1 実装 Issue が原則。大きすぎる場合はユーザーに分割提案する

## フロー

1. args から spec を特定する（Issue 番号 → frontmatter の `issue` で照合 / ファイルパス → 直接 Read）
2. spec の `status` を確認。`draft` なら警告して停止
3. 以下のテンプレートで GitHub Issue を作成する（ラベル: `type:impl` + `loop:ready`。`loop:ready` を付けると dev-loop が自律実装を開始するため、付与するかユーザーに確認する）
4. 作成した Issue 番号を報告する

## 実装 Issue テンプレート

```markdown
> spec駆動開発フローの Issue B（Implement）です。

## 対象 spec

- Issue: #<spec Issue番号>
- ファイル: `specs/<slug>.md`
- Status: approved

## 実装タスク

（spec のスコープ「含むもの」を実装単位に分解）

- [ ] ...
- [ ] ...

## 受け入れ条件

（spec の受け入れシナリオ AC-xxx をそのまま転記）

- [ ] AC-001: ...
- [ ] AC-002: ...

## 技術メモ（任意）

（実装方針のヒント。spec には書かない実装詳細をここに）
```

## 完了条件

- [ ] GitHub Issue が `type:impl` + `loop:ready` ラベルで作成されている
- [ ] Issue 本文に spec への参照（Issue番号 + ファイルパス）が含まれている
- [ ] 受け入れ条件が spec の AC-xxx と対応している
