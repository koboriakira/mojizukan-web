#!/bin/bash
# path-scope: spec PR と実装 PR のファイルスコープ分離を検証
# specs/README.md の「Spec PR は specs/ のみ、Impl PR は specs/ 以外」を機械検証する
#
# 注意: CI 環境（$CI が設定されている）で origin/main が取得できない場合は SKIP する。
# ローカルでは origin/main が無ければ `git diff --cached --name-only` にフォールバックする。

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || exit 1
violations=0

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  changed_files="$(git diff --name-only origin/main...HEAD 2>/dev/null)"
elif [ -n "$CI" ]; then
  echo "SKIP: origin/main not available in CI environment"
  echo "VIOLATIONS: 0"
  exit 0
else
  changed_files="$(git diff --cached --name-only 2>/dev/null)"
fi

if [ -z "$changed_files" ]; then
  echo "SKIP: no changed files detected"
  echo "VIOLATIONS: 0"
  exit 0
fi

# specs/ の変更（README.md・_template.md はメタファイルとして除外）
specs_changed=$(echo "$changed_files" | grep -E '^specs/' | grep -vE '^specs/(README\.md|_template\.md)$')
# 実装側の変更
impl_changed=$(echo "$changed_files" | grep -E '^(src|migrations)/')

if [ -n "$specs_changed" ] && [ -n "$impl_changed" ]; then
  echo "VIOLATION: spec files and implementation files are changed in the same PR"
  echo "specs/ changes:"
  while IFS= read -r f; do echo "  $f"; done <<< "$specs_changed"
  echo "src/ or migrations/ changes:"
  while IFS= read -r f; do echo "  $f"; done <<< "$impl_changed"
  violations=1
fi

echo "VIOLATIONS: $violations"
if [ "$violations" -eq 0 ]; then
  echo "OK: spec changes and implementation changes are not mixed"
fi
[ "$violations" -gt 0 ] && exit 1 || exit 0
