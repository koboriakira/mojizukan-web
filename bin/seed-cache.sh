#!/bin/bash
# 共有キャッシュの初期データを D1 + R2 に投入するスクリプト
# 使い方:
#   bash bin/seed-cache.sh              # ローカル
#   bash bin/seed-cache.sh --env staging # staging 環境
set -euo pipefail

REMOTE=""
ENV_FLAG=""
DB_NAME="mojizukan-db"
BUCKET_NAME="mojizukan-images"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_FLAG="--env $2"
      REMOTE="--remote"
      DB_NAME="mojizukan-db-$2"
      BUCKET_NAME="mojizukan-images-$2"
      shift 2
      ;;
    --remote)
      echo "⚠️  --remote は非推奨です。--env staging を使ってください"
      ENV_FLAG="--env staging"
      REMOTE="--remote"
      DB_NAME="mojizukan-db-staging"
      BUCKET_NAME="mojizukan-images-staging"
      shift
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

CACHE_DIR="cache-samples"
if [ ! -d "$CACHE_DIR/descriptions" ] || [ ! -d "$CACHE_DIR/images" ]; then
  echo "ERROR: $CACHE_DIR が見つかりません。先に generate-cache-samples.sh を実行してください"
  exit 1
fi

echo "=== 共有キャッシュ シード ==="
echo "モード: ${REMOTE:-local}"
echo "DB: $DB_NAME / R2: $BUCKET_NAME"

# --- R2 に画像をアップロード ---
echo ""
echo "--- R2 画像アップロード ---"
IMG_COUNT=0
IMG_TOTAL=$(ls "$CACHE_DIR/images/"*.webp 2>/dev/null | wc -l | tr -d ' ')

for img in "$CACHE_DIR/images/"*.webp; do
  IMG_COUNT=$((IMG_COUNT + 1))
  FILENAME=$(basename "$img")
  R2_KEY="cache/$FILENAME"

  echo "[$IMG_COUNT/$IMG_TOTAL] $FILENAME → $R2_KEY"
  npx wrangler r2 object put "$BUCKET_NAME/$R2_KEY" --file "$img" --content-type "image/webp" $REMOTE 2>/dev/null
done

# --- D1 に shared_cache レコードを投入 ---
echo ""
echo "--- D1 shared_cache 投入 ---"

WORDS=$(ls "$CACHE_DIR/descriptions/"*.json | xargs -I{} basename {} .json)
STYLES="ehon honwaka pop watercolor zukan"
SQL_STATEMENTS=""

for word in $WORDS; do
  DESC=$(python3 -c "
import json, sys
with open('$CACHE_DIR/descriptions/$word.json') as f:
    data = json.load(f)
    desc = data.get('description', '')
    print(desc.replace(\"'\", \"''\"))
")

  for style in $STYLES; do
    IMG_FILE="${style}_${word}.webp"
    if [ ! -f "$CACHE_DIR/images/$IMG_FILE" ]; then
      echo "SKIP: $IMG_FILE not found"
      continue
    fi
    IMAGE_URL="/images/cache/$IMG_FILE"
    SQL_STATEMENTS="${SQL_STATEMENTS}INSERT OR IGNORE INTO shared_cache (word, style, image_url, description) VALUES ('$word', '$style', '$IMAGE_URL', '$DESC');\n"
  done
done

echo -e "$SQL_STATEMENTS" | npx wrangler d1 execute "$DB_NAME" --command "$(echo -e "$SQL_STATEMENTS")" $REMOTE

echo ""
echo "=== 完了 ==="
echo "画像: $IMG_TOTAL 件"
echo "D1 レコード: $(echo "$WORDS" | wc -w | tr -d ' ') 語 × $(echo "$STYLES" | wc -w | tr -d ' ') スタイル"
