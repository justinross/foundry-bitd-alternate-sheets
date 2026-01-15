#!/usr/bin/env bash
set -euo pipefail

DEFAULT_MANIFEST_URL="https://raw.githubusercontent.com/Dez384/foundryvtt-blades-in-the-dark/master/system.json"
MANIFEST_URL="${FOUNDRY_SYSTEM_MANIFEST_URL:-${1:-$DEFAULT_MANIFEST_URL}}"

for cmd in curl jq unzip; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing dependency: $cmd"; exit 1; }
done

tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT

manifest_json="$tmp_dir/system.json"
if ! curl -fsSL "$MANIFEST_URL" -o "$manifest_json"; then
  echo "Failed to download manifest: $MANIFEST_URL"
  exit 1
fi

id="$(jq -r '.id // empty' "$manifest_json")"
download_url="$(jq -r '.download // empty' "$manifest_json")"

if [[ -z "$id" || -z "$download_url" ]]; then
  echo "Invalid manifest: missing id or download"
  exit 1
fi

target_dir="/data/Data/systems/$id"

if [[ -f "$target_dir/system.json" ]]; then
  echo "System '$id' already installed at $target_dir"
  exit 0
fi

mkdir -p "$target_dir"

zip_path="$tmp_dir/system.zip"
if ! curl -fsSL "$download_url" -o "$zip_path"; then
  echo "Failed to download system zip: $download_url"
  exit 1
fi

unzip_dir="$tmp_dir/unzip"
mkdir -p "$unzip_dir"
unzip -q "$zip_path" -d "$unzip_dir"

# Handle single top-level folder
contents=("$unzip_dir"/*)
if [[ ${#contents[@]} -eq 1 && -d "${contents[0]}" ]]; then
  src_dir="${contents[0]}"
else
  src_dir="$unzip_dir"
fi

cp -a "$src_dir"/. "$target_dir"/

echo "Installed system '$id' to $target_dir"
