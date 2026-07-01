#!/usr/bin/env bash
set -euo pipefail

# ステージング D1 データベースの初期化
# Usage:
#   bash bin/reset-db.sh          # ローカル DB をリセット
#   bash bin/reset-db.sh --remote # リモート（ステージング）DB をリセット

REMOTE_FLAG=""
if [[ "${1:-}" == "--remote" ]]; then
  REMOTE_FLAG="--remote"
  echo "⚠️  リモート（ステージング）DB をリセットします"
  read -p "本当に実行しますか？ (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "中止しました"
    exit 0
  fi
fi

TABLES=$(npx wrangler d1 execute mojizukan-db $REMOTE_FLAG \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' AND name != 'sqlite_sequence';" \
  --json 2>/dev/null | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const tables = data[0].results.map(r => r.name);
    console.log(tables.join('\n'));
  ")

if [[ -z "$TABLES" ]]; then
  echo "テーブルなし。マイグレーションを適用します。"
else
  echo "以下のテーブルを削除します:"
  echo "$TABLES"
  for attempt in 1 2 3; do
    REMAINING=""
    for table in $TABLES; do
      npx wrangler d1 execute mojizukan-db $REMOTE_FLAG \
        --command "DROP TABLE IF EXISTS \"$table\";" 2>/dev/null \
        && echo "  ✓ $table" \
        || REMAINING="${REMAINING} ${table}"
    done
    TABLES="$REMAINING"
    if [[ -z "$TABLES" ]]; then break; fi
    echo "  Retry (attempt $((attempt+1))): $TABLES"
  done
fi

npx wrangler d1 execute mojizukan-db $REMOTE_FLAG \
  --command "DELETE FROM d1_migrations;" 2>/dev/null

echo ""
echo "マイグレーションを適用中..."
npx wrangler d1 migrations apply mojizukan-db $REMOTE_FLAG

echo ""
echo "✅ DB リセット完了"
