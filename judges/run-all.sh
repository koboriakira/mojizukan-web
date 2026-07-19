#!/bin/bash
# run-all: 全 judge を順次実行し、結果を集約する

JUDGES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
total_violations=0
total_warnings=0
failed_judges=()

for judge in "$JUDGES_DIR"/*.sh; do
  [ "$(basename "$judge")" = "run-all.sh" ] && continue
  [ ! -x "$judge" ] && chmod +x "$judge"

  echo "--- $(basename "$judge") ---"
  output=$(bash "$judge" 2>&1)
  echo "$output"

  v=$(echo "$output" | grep -o 'VIOLATIONS: [0-9]*' | grep -o '[0-9]*')
  w=$(echo "$output" | grep -o 'WARNINGS: [0-9]*' | grep -o '[0-9]*')

  if [ -n "$v" ] && [ "$v" -gt 0 ]; then
    total_violations=$((total_violations + v))
    failed_judges+=("$(basename "$judge")")
  fi
  [ -n "$w" ] && total_warnings=$((total_warnings + w))
  echo ""
done

echo "=== SUMMARY ==="
echo "TOTAL VIOLATIONS: $total_violations"
echo "TOTAL WARNINGS: $total_warnings"

if [ ${#failed_judges[@]} -gt 0 ]; then
  echo "FAILED: ${failed_judges[*]}"
  exit 1
fi

echo "ALL JUDGES PASSED"
exit 0
