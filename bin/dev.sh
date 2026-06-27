#!/usr/bin/env bash
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

if [ "$BRANCH" = "main" ]; then
  PORT=8787
else
  HASH=$(echo -n "$BRANCH" | cksum | awk '{print $1}')
  PORT=$(( (HASH % 100) + 8788 ))
fi

echo "Branch: $BRANCH → Port: $PORT"
exec npx wrangler dev --port "$PORT" "$@"
