#!/bin/bash
# Run all judge scripts in this directory
# Exit with non-zero if any judge finds violations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
total_violations=0
failed_judges=()

for judge in "$SCRIPT_DIR"/*.sh; do
  [ "$(basename "$judge")" = "run-all.sh" ] && continue
  [ ! -x "$judge" ] && chmod +x "$judge"

  echo "--- $(basename "$judge") ---"
  output=$(bash "$judge" 2>&1)
  status=$?
  echo "$output"

  if [ $status -ne 0 ]; then
    v=$(echo "$output" | grep -o 'VIOLATIONS: [0-9]*' | tail -1 | grep -o '[0-9]*')
    if [ -n "$v" ]; then
      total_violations=$((total_violations + v))
    else
      total_violations=$((total_violations + 1))
    fi
    failed_judges+=("$(basename "$judge")")
  fi
  echo ""
done

echo "=== SUMMARY ==="
if [ ${#failed_judges[@]} -eq 0 ]; then
  echo "All judges passed."
  exit 0
else
  echo "Failed judges: ${failed_judges[*]}"
  echo "Total violations: $total_violations"
  exit 1
fi
