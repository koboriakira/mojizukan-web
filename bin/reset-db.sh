#!/usr/bin/env bash
set -euo pipefail

# ローカル D1 データベースのリセット
# リモート（staging）のリセットは CI の Reset Environment ワークフローを使う

TABLES=$(npx wrangler d1 execute mojizukan-db \
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
      npx wrangler d1 execute mojizukan-db \
        --command "DROP TABLE IF EXISTS \"$table\";" 2>/dev/null \
        && echo "  ✓ $table" \
        || REMAINING="${REMAINING} ${table}"
    done
    TABLES="$REMAINING"
    if [[ -z "$TABLES" ]]; then break; fi
    echo "  Retry (attempt $((attempt+1))): $TABLES"
  done
fi

npx wrangler d1 execute mojizukan-db \
  --command "DELETE FROM d1_migrations;" 2>/dev/null

echo ""
echo "マイグレーションを適用中..."
npx wrangler d1 migrations apply mojizukan-db

echo ""
echo "✅ ローカル DB リセット完了"
