# dev-loop 完了契約

このファイルは dev-loop（GitHub Issue 駆動の自律実装ループ）がこのリポジトリで動作するための宣言。
dev-loop はこのファイルが存在しないリポジトリではループを回さない。

## done の定義

- PR を作成し `Closes #<Issue番号>` を本文に含める
- PR 作成前に `/dev-pipeline finish <Issue番号>` 相当のスコープ・受入検証を実行する
- マージは人間ゲート

## VERIFY ゲート

CI 必須。PR の必須チェックがすべてグリーンであること。

ローカルで push 前に実行すべきコマンド:

```bash
npm run typecheck
npm run test
```

`src/client/*.ts` に変更がある場合は E2E も実行:

```bash
npm run test:e2e
```

## 副作用の境界

- Vault（`~/obsidian/my-vault`）への書き込み: **なし**
- 外部サービスへの送信: **なし**
- staging/本番へのデプロイ: **CI 経由のみ**（ローカルから wrangler でリモートを触らない）

## パイプラインスキル

| フェーズ | コマンド |
|---------|---------|
| キックオフ | `/dev-pipeline start <Issue番号>` |
| PR前検証 | `/dev-pipeline finish <Issue番号>` |
