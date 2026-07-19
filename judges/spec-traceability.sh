#!/bin/bash
# spec-traceability: approved spec の受け入れシナリオ（AC-XXX）にテストが対応しているか検証
# specs/README.md の「テストはこの ID をテスト名に含める」を機械検証する
#
# テンプレート導入初期は WARNING のみ（VIOLATION にはしない）。

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPECS_DIR="$REPO_ROOT/specs"
violations=0
warnings=0

approved_specs=()
if [ -d "$SPECS_DIR" ]; then
  while IFS= read -r -d '' f; do
    base="$(basename "$f")"
    [ "$base" = "README.md" ] && continue
    [ "$base" = "_template.md" ] && continue
    if grep -qE '^status:[[:space:]]*approved' "$f"; then
      approved_specs+=("$f")
    fi
  done < <(find "$SPECS_DIR" -maxdepth 1 -name "*.md" -print0 2>/dev/null)
fi

if [ ${#approved_specs[@]} -eq 0 ]; then
  echo "SKIP: no approved spec files found in specs/"
  echo "VIOLATIONS: 0"
  echo "WARNINGS: 0"
  exit 0
fi

test_ids=""
if [ -d "$REPO_ROOT/src" ]; then
  test_ids=$(find "$REPO_ROOT/src" -name "*.test.ts" -exec grep -ohE 'AC-[0-9]+' {} + 2>/dev/null | sort -u)
fi

for spec in "${approved_specs[@]}"; do
  spec_ids=$(grep -oE '^### AC-[0-9]+' "$spec" | grep -oE 'AC-[0-9]+' | sort -u)
  [ -z "$spec_ids" ] && continue
  while IFS= read -r id; do
    [ -z "$id" ] && continue
    if ! printf '%s\n' "$test_ids" | grep -qx "$id"; then
      echo "WARNING: $id in $(basename "$spec") has no matching test in src/**/*.test.ts"
      warnings=$((warnings + 1))
    fi
  done <<< "$spec_ids"
done

echo "VIOLATIONS: $violations"
echo "WARNINGS: $warnings"
if [ "$warnings" -eq 0 ]; then
  echo "OK: all approved spec acceptance scenarios have matching tests"
fi
exit 0
