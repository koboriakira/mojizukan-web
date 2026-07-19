#!/bin/bash
# migration-integrity: migrations/ 以下の連番整合性チェック
# .claude/rules/migration-integrity.md の不変条件を機械検証する

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/migrations"
violations=0

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "VIOLATIONS: 0"
  echo "OK: migrations/ directory does not exist, nothing to check"
  exit 0
fi

# Check 1: filename pattern NNNN_description.sql
while IFS= read -r -d '' file; do
  base="$(basename "$file")"
  if ! [[ "$base" =~ ^[0-9]{4}_[a-z0-9_]+\.sql$ ]]; then
    echo "INVALID filename pattern: $file"
    violations=$((violations + 1))
  fi
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" -print0 2>/dev/null)

# Check 2: sequence starts at 0001 and has no gaps
numbers=$(find "$MIGRATIONS_DIR" -maxdepth 1 -name "[0-9][0-9][0-9][0-9]_*.sql" -print0 2>/dev/null \
  | xargs -0 -n1 basename 2>/dev/null \
  | sed -E 's/^([0-9]{4})_.*/\1/' \
  | sort -n)

if [ -n "$numbers" ]; then
  expected=1
  while IFS= read -r num; do
    num_int=$((10#$num))
    if [ "$num_int" -ne "$expected" ]; then
      echo "SEQUENCE GAP: expected $(printf '%04d' "$expected"), found $num"
      violations=$((violations + 1))
      expected=$((num_int + 1))
    else
      expected=$((expected + 1))
    fi
  done <<< "$numbers"
fi

echo "VIOLATIONS: $violations"
if [ "$violations" -eq 0 ]; then
  echo "OK: migration-integrity check passed"
fi
[ "$violations" -gt 0 ] && exit 1 || exit 0
