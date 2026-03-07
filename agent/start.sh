#!/usr/bin/env bash
set -euo pipefail

CODEX_HOME_DIR="${CODEX_HOME:-/home/me/.codex}"

fix_dir_permissions() {
  local dir_path="$1"
  local dir_owner="$2"
  local dir_group="$3"
  local dir_mode="$4"

  sudo mkdir -p "$dir_path"
  sudo chown "${dir_owner}:${dir_group}" "$dir_path"
  sudo chmod "$dir_mode" "$dir_path"
}

sudo mkdir -p "/tmp"
sudo chmod 1777 "/tmp"
fix_dir_permissions "$CODEX_HOME_DIR" "me" "me" "0755"
fix_dir_permissions "/app/.codex" "me" "me" "0755"

git config core.pager delta
git config interactive.diffFilter "delta --color-only"
git config delta.navigate true

exec codex resume
