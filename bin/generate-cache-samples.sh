#!/bin/bash
# 共有キャッシュのサンプル画像＋説明文を生成するスクリプト
# 使い方: bash bin/generate-cache-samples.sh
# .env に OPENAI_API_KEY が設定されている前提

set -euo pipefail

if [ -f .env ]; then
  export "$(grep OPENAI_API_KEY .env | xargs)"
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "ERROR: OPENAI_API_KEY が設定されていません (.env または環境変数)"
  exit 1
fi

OUTPUT_DIR="cache-samples"
mkdir -p "$OUTPUT_DIR/images" "$OUTPUT_DIR/descriptions"

# スタイルとプロンプトテンプレート
declare -A STYLES
STYLES[honwaka]="A cute illustration of {subject} in soft pastel colors with rounded shapes, gentle and warm style, suitable for children. White background, no text, no letters."
STYLES[ehon]="A picture book illustration of {subject} in pencil and watercolor hand-drawn style, warm and nostalgic. White background, no text, no letters."
STYLES[pop]="A cartoon illustration of {subject} with thick black outlines, vivid and bright colors, fun cartoon style for kids. White background, no text, no letters."
STYLES[watercolor]="A transparent watercolor painting of {subject}, delicate and airy, beautiful gradients, artistic watercolor style. White background, no text, no letters."
STYLES[zukan]="A detailed encyclopedia-style scientific illustration of {subject}, accurate proportions, natural history illustration style. White background, no text, no letters."

# サンプル単語（日本語 → 英語）
declare -A WORDS
WORDS[いぬ]="dog"
WORDS[うま]="horse"
WORDS[くま]="bear"
WORDS[さかな]="fish"
WORDS[すいか]="watermelon"
WORDS[つき]="moon"
WORDS[とり]="bird"
WORDS[ねこ]="cat"
WORDS[はな]="flower"
WORDS[やま]="mountain"

IMAGE_TOTAL=$(( ${#WORDS[@]} * ${#STYLES[@]} ))
DESC_TOTAL=${#WORDS[@]}

echo "=== 共有キャッシュサンプル生成 ==="
echo "単語数: ${#WORDS[@]}, スタイル数: ${#STYLES[@]}"
echo "画像: $IMAGE_TOTAL 枚, 説明文: $DESC_TOTAL 件"
echo "出力先: $OUTPUT_DIR/"
echo ""

# --- 説明文の生成 ---
echo "--- 説明文の生成 ---"
DESC_COUNT=0
for jp_word in "${!WORDS[@]}"; do
  DESC_COUNT=$((DESC_COUNT + 1))
  DESCFILE="$OUTPUT_DIR/descriptions/${jp_word}.json"

  if [ -f "$DESCFILE" ]; then
    echo "[$DESC_COUNT/$DESC_TOTAL] SKIP $jp_word (already exists)"
    continue
  fi

  echo "[$DESC_COUNT/$DESC_TOTAL] Generating description for $jp_word..."

  DESC_PROMPT="「${jp_word}」についての子ども向け図鑑エントリを作ってください。

ルール:
- 3〜4歳の子どもが理解できるやさしい言葉で説明する
- ひらがなを中心に使う
- ですます調・〜よ・〜ね のトーンで書く
- 2文で書く（1文目と2文目を「。」で区切る）

出力はJSON形式のみで返してください。コードブロックや説明文は不要です。
{\"emoji\":\"絵文字1つ\",\"description\":\"説明文（2文）\"}"

  RESPONSE=$(curl -s "https://api.openai.com/v1/chat/completions" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"gpt-5.4\",
      \"messages\": [{\"role\": \"user\", \"content\": $(echo "$DESC_PROMPT" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}],
      \"response_format\": {\"type\": \"json_object\"},
      \"max_completion_tokens\": 200
    }")

  CONTENT=$(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'choices' in data:
    print(data['choices'][0]['message']['content'])
elif 'error' in data:
    print('ERROR:' + data['error'].get('message', 'unknown'), file=sys.stderr)
    sys.exit(1)
")

  echo "$CONTENT" > "$DESCFILE"
  echo "  OK: $DESCFILE"
  sleep 0.5
done

# --- 画像の生成 ---
echo ""
echo "--- 画像の生成 ---"
IMG_COUNT=0
for jp_word in "${!WORDS[@]}"; do
  en_word="${WORDS[$jp_word]}"

  for style in "${!STYLES[@]}"; do
    IMG_COUNT=$((IMG_COUNT + 1))
    OUTFILE="$OUTPUT_DIR/images/${style}_${jp_word}.webp"

    if [ -f "$OUTFILE" ]; then
      echo "[$IMG_COUNT/$IMAGE_TOTAL] SKIP $style/$jp_word (already exists)"
      continue
    fi

    PROMPT="${STYLES[$style]/\{subject\}/$en_word}"
    echo "[$IMG_COUNT/$IMAGE_TOTAL] Generating $style/$jp_word ($en_word)..."

    RESPONSE=$(curl -s "https://api.openai.com/v1/images/generations" \
      -H "Authorization: Bearer $OPENAI_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"gpt-image-1-mini\",
        \"prompt\": \"$PROMPT\",
        \"n\": 1,
        \"size\": \"1024x1024\",
        \"quality\": \"low\",
        \"output_format\": \"webp\"
      }")

    B64=$(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'data' in data and data['data']:
    print(data['data'][0].get('b64_json', ''))
elif 'error' in data:
    print('ERROR:' + data['error'].get('message', 'unknown'), file=sys.stderr)
    sys.exit(1)
")

    if [ -z "$B64" ]; then
      echo "  ERROR: b64_json が空です"
      continue
    fi

    echo "$B64" | base64 -d > "$OUTFILE"
    SIZE=$(wc -c < "$OUTFILE" | tr -d ' ')
    echo "  OK: $OUTFILE ($SIZE bytes)"
    sleep 1
  done
done

echo ""
echo "=== 完了 ==="
echo "説明文:"
ls "$OUTPUT_DIR/descriptions/"
echo ""
echo "画像:"
ls "$OUTPUT_DIR/images/"
