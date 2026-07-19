# specs/ — 変更契約の正本

`specs/` 配下の各ファイルは、機能追加・変更の「何を作るか」を定義する変更契約の正本である。
実装（`src/`, `migrations/`）は spec の記述内容を満たすことを目的とし、spec に書かれていない挙動を実装側で先に決めない。

## フォーマット

新しい spec は `specs/_template.md` をコピーして作成する。構造:

- **フロントマター** — `title` / `status`（`draft` / `approved` / `superseded`）/ `issue`（GitHub Issue 番号）/ `superseded_by` / `created`
- **目的** — 1-2文で何を作るか
- **スコープ** — 含むもの / 含まないもの（非スコープ）を明示する
- **不変条件** — この変更が守るべき制約
- **API 契約**（該当する場合）— エンドポイント・メソッド・リクエスト/レスポンス形状。機械可読にするなら同ディレクトリに `contract.ts` を置く
- **受け入れシナリオ** — `AC-001` のように一意の ID を付けた Given/When/Then。テストはこの ID をテスト名に含める（`judges/spec-traceability.sh` が spec とテストの対応を検証する）

## 人間レビュー必須

`specs/` への変更は `.github/CODEOWNERS` により人間レビュー（@koboriakira）が必須になる。
`judges/path-scope.sh` が「spec の変更」と「実装（`src/`, `migrations/`）の変更」が同一 PR に混在していないかを機械検証し、spec のレビュー単位と実装のレビュー単位を分離する。

## 逆流経路: 実装中に spec 欠陥を発見したら

実装（Issue B）を進める中で spec（Issue A）の記述に誤り・漏れ・矛盾が見つかった場合、実装側で spec を書き換えて押し通さない。

1. spec 修正用の新しい Issue（Issue A'）を起票する。何が誤っていたか、どう直すべきかを記述する
2. Issue B を `blocked` にし、Issue A' への参照を残す
3. Issue A' が人間レビューを経て spec を修正・承認したら、Issue B の blocked を解除して実装を再開する

この逆流経路により、spec の変更は常に人間承認ゲート（CODEOWNERS）を通る。実装の都合で spec がなし崩しに書き換わることを防ぐ。
