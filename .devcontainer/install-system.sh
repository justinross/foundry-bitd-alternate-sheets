#!/usr/bin/env bash
set -euo pipefail

LOG_PREFIX="[install-system]"

# Wait for Foundry container to finish initializing
echo "$LOG_PREFIX Waiting for Foundry container to initialize..."
sleep 10

# Poll for /data/Data/systems directory with timeout
SYSTEMS_DIR="/data/Data/systems"
TIMEOUT=120
INTERVAL=5
elapsed=0

while [[ ! -d "$SYSTEMS_DIR" ]]; do
  if [[ $elapsed -ge $TIMEOUT ]]; then
    echo "$LOG_PREFIX ERROR: Timeout waiting for Foundry to initialize (${TIMEOUT}s)"
    echo "$LOG_PREFIX The directory $SYSTEMS_DIR was not created."
    echo "$LOG_PREFIX This may be expected if Foundry hasn't started yet."
    echo "$LOG_PREFIX You can manually run: bash .devcontainer/install-system.sh"
    exit 1
  fi
  echo "$LOG_PREFIX Waiting for $SYSTEMS_DIR to be created... (${elapsed}s/${TIMEOUT}s)"
  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))
done

echo "$LOG_PREFIX Foundry container initialized. Proceeding with system installation..."

DEFAULT_MANIFEST_URL="https://raw.githubusercontent.com/Dez384/foundryvtt-blades-in-the-dark/master/system.json"
MANIFEST_URL="${FOUNDRY_SYSTEM_MANIFEST_URL:-${1:-$DEFAULT_MANIFEST_URL}}"

for cmd in curl jq unzip; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "$LOG_PREFIX ERROR: Missing dependency: $cmd"; exit 1; }
done

tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT

manifest_json="$tmp_dir/system.json"
echo "$LOG_PREFIX Downloading manifest from: $MANIFEST_URL"
if ! curl -fsSL "$MANIFEST_URL" -o "$manifest_json"; then
  echo "$LOG_PREFIX ERROR: Failed to download manifest: $MANIFEST_URL"
  exit 1
fi

id="$(jq -r '.id // empty' "$manifest_json")"
download_url="$(jq -r '.download // empty' "$manifest_json")"

if [[ -z "$id" || -z "$download_url" ]]; then
  echo "$LOG_PREFIX ERROR: Invalid manifest: missing id or download"
  exit 1
fi

echo "$LOG_PREFIX Found system ID: $id"

target_dir="/data/Data/systems/$id"
if [[ -d "$target_dir" ]]; then
  echo "$LOG_PREFIX System '$id' already installed at $target_dir"
  exit 0
fi

echo "$LOG_PREFIX Installing system to: $target_dir"
mkdir -p "$target_dir"
zip_path="$tmp_dir/system.zip"
echo "$LOG_PREFIX Downloading system from: $download_url"
if ! curl -fsSL "$download_url" -o "$zip_path"; then
  echo "$LOG_PREFIX ERROR: Failed to download system zip: $download_url"
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
echo "$LOG_PREFIX ✓ Successfully installed system '$id' to $target_dir"
echo "$LOG_PREFIX Installation complete!"
