#!/usr/bin/env bash
set -euo pipefail

# おためしことば（STARTER_WORDS）を shared_cache に事前投入するスクリプト
#
# STARTER_WORDS の10語それぞれについて認証済みユーザーとして
# POST /api/hakken/generate を呼ぶ。キャッシュミス時のみ AI 生成が走り、
# 結果は shared_cache に自動保存される（既存の仕組み）。
# 既にキャッシュ済みの語はキャッシュヒットとして扱われ、再生成されない（冪等）。
#
# Usage:
#   bash bin/seed-starter-words.sh          # ローカル環境にシード
#   bash bin/seed-starter-words.sh --remote  # 本番環境にシード（確認プロンプトあり）

# src/client/dictionary.ts の STARTER_WORDS と同期させること
WORDS=(いぬ うま くま さかな すいか つき とり ねこ はな やま)

SEED_EMAIL="${SEED_EMAIL:-seed-starter-words@mojizukan.local}"
SEED_PASSWORD="${SEED_PASSWORD:-seed-starter-words-2026}"

REMOTE=false
if [[ "${1:-}" == "--remote" ]]; then
  REMOTE=true
fi

if $REMOTE; then
  BASE_URL="${STAGING_URL:-https://mojizukan-web.private-beats.workers.dev}"
  echo "⚠️  本番環境にシードします: $BASE_URL"
  read -p "本当に実行しますか？ (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "中止しました"
    exit 0
  fi
else
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
  if [ "$BRANCH" = "main" ]; then
    PORT=8787
  else
    HASH=$(echo -n "$BRANCH" | cksum | awk '{print $1}')
    PORT=$(( (HASH % 100) + 8788 ))
  fi
  BASE_URL="http://localhost:$PORT"
fi

echo "=== おためしことば シード ==="
echo "対象: $BASE_URL"
echo ""

COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "--- ログイン ---"
LOGIN_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SEED_EMAIL\",\"password\":\"$SEED_PASSWORD\"}" \
  "$BASE_URL/api/auth/login")

if [[ "$LOGIN_STATUS" == "200" ]]; then
  echo "  ✓ ログイン完了 ($SEED_EMAIL)"
else
  echo "  ログイン失敗（HTTP ${LOGIN_STATUS}）。シード用ユーザーを新規登録します。"
  SIGNUP_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -c "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$SEED_EMAIL\",\"password\":\"$SEED_PASSWORD\"}" \
    "$BASE_URL/api/auth/signup")
  if [[ "$SIGNUP_STATUS" != "201" ]]; then
    echo "ERROR: ログイン・新規登録の両方が失敗しました（signup: HTTP ${SIGNUP_STATUS}）"
    exit 1
  fi
  echo "  ✓ 新規登録完了 ($SEED_EMAIL)"
fi

echo ""
echo "--- シード投入 ---"
TOTAL=${#WORDS[@]}
COUNT=0
FAIL=0

for word in "${WORDS[@]}"; do
  COUNT=$((COUNT + 1))
  RESPONSE=$(curl -sS -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -d "{\"word\":\"$word\"}" \
    "$BASE_URL/api/hakken/generate")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" == "200" ]]; then
    CACHED=$(echo "$BODY" | node -e "
      const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
      console.log(data.cached ? 'true' : 'false');
    " 2>/dev/null || echo "unknown")
    case "$CACHED" in
      true) echo "[$COUNT/$TOTAL] ✓ $word: キャッシュヒット" ;;
      false) echo "[$COUNT/$TOTAL] ✓ $word: 新規生成" ;;
      *) echo "[$COUNT/$TOTAL] ✓ $word: 完了（レスポンス解析失敗）" ;;
    esac
  else
    FAIL=$((FAIL + 1))
    ERROR_MSG=$(echo "$BODY" | node -e "
      const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
      console.log(data.error || 'unknown error');
    " 2>/dev/null || echo "unknown error")
    echo "[$COUNT/$TOTAL] ✗ $word: エラー (HTTP $HTTP_CODE $ERROR_MSG)"
  fi
done

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "✅ 完了（$TOTAL 語すべて成功）"
else
  echo "⚠️  完了（$((TOTAL - FAIL))/$TOTAL 語成功、$FAIL 語失敗）"
  exit 1
fi
