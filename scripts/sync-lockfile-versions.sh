#!/usr/bin/env bash
# bun installはworkspaceのversionの変更をbun.lockへ反映しないため、明示的に同期
set -euo pipefail

cd "$(dirname "$0")/.."

for pkg in packages/*/; do
  name="$(jq -r '.name' "${pkg}package.json")"
  ver="$(jq -r '.version' "${pkg}package.json")"
  NAME="$name" VER="$ver" perl -0pi -e '
    my $name = quotemeta($ENV{NAME});
    my $ver = $ENV{VER};
    s/("name": "$name",\s*"version": ")[^"]*(")/${1}${ver}${2}/;
  ' bun.lock
done
