#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <branch-name>"
  echo "Example: $0 feat/image-generation"
  exit 1
fi

BRANCH="$1"
SAFE_NAME=$(echo "$BRANCH" | tr '/' '-')
WORKTREE_DIR="../mojizukan-web-${SAFE_NAME}"

git worktree add "$WORKTREE_DIR" -b "$BRANCH" 2>/dev/null \
  || git worktree add "$WORKTREE_DIR" "$BRANCH"

cd "$WORKTREE_DIR"
npm install --silent

HASH=$(echo -n "$BRANCH" | cksum | awk '{print $1}')
PORT=$(( (HASH % 100) + 8788 ))

echo ""
echo "Worktree ready:"
echo "  Path:   $(pwd)"
echo "  Branch: $BRANCH"
echo "  Port:   $PORT"
echo ""
echo "Start dev server:"
echo "  cd $(pwd) && npm run dev"
