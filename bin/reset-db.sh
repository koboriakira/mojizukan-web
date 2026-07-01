#!/usr/bin/env bash
set -euo pipefail

# D1 データベースのリセット
# Usage:
#   bash bin/reset-db.sh              # ローカル DB をリセット
#   bash bin/reset-db.sh --env staging # staging DB をリセット

ENV_FLAG=""
REMOTE_FLAG=""
DB_NAME="mojizukan-db"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_FLAG="--env $2"
      REMOTE_FLAG="--remote"
      DB_NAME="mojizukan-db-$2"
      shift 2
      ;;
    --remote)
      echo "⚠️  --remote は非推奨です。--env staging を使ってください"
      ENV_FLAG="--env staging"
      REMOTE_FLAG="--remote"
      DB_NAME="mojizukan-db-staging"
      shift
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -n "$REMOTE_FLAG" ]]; then
  echo "⚠️  リモート DB ($DB_NAME) をリセットします"
  read -p "本当に実行しますか？ (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "中止しました"
    exit 0
  fi
fi

TABLES=$(npx wrangler d1 execute "$DB_NAME" $REMOTE_FLAG \
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
  for table in $TABLES; do
    npx wrangler d1 execute "$DB_NAME" $REMOTE_FLAG \
      --command "DROP TABLE IF EXISTS \"$table\";" 2>/dev/null
    echo "  ✓ $table"
  done
fi

echo ""
echo "マイグレーションを適用中..."
npx wrangler d1 migrations apply "$DB_NAME" $ENV_FLAG $REMOTE_FLAG

echo ""
echo "✅ DB リセット完了 ($DB_NAME)"
