#!/usr/bin/env bash
set -euo pipefail
if result=$(docker buildx imagetools inspect "${1:?Pass a full image reference}" --format '{{.Manifest.Digest}}' 2>&1); then
 [[ "$result" =~ ^sha256:[0-9a-f]{64}$ ]] || { printf '%s\n' "$result" >&2; exit 1; }
 printf '%s\n' "$result"
else
 case "$result" in
  *'manifest unknown'*|*'not found'*|*'NAME_UNKNOWN'*|*'MANIFEST_UNKNOWN'*) exit 3 ;;
  *) printf '%s\n' "$result" >&2; exit 1 ;;
 esac
fi
