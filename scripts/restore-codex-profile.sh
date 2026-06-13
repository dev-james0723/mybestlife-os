#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ZIP_PATH="${1:-$REPO_ROOT/codex-profile-export-redacted.zip}"
RESTORE_WORK="$REPO_ROOT/.codex-profile-restore-$(date -u '+%Y%m%dT%H%M%SZ')-$$"

log() {
  printf '[restore] %s\n' "$*"
}

warn() {
  printf '[restore][warn] %s\n' "$*" >&2
}

have() {
  command -v "$1" >/dev/null 2>&1
}

safe_extract_zip() {
  local zip_path="$1"
  local target_dir="$2"

  if have python3; then
    python3 - "$zip_path" "$target_dir" <<'PY'
import sys
import zipfile
from pathlib import Path, PurePosixPath

zip_path = Path(sys.argv[1])
target_dir = Path(sys.argv[2]).resolve()

with zipfile.ZipFile(zip_path) as zf:
    for info in zf.infolist():
        name = info.filename
        pure = PurePosixPath(name)
        if pure.is_absolute() or any(part in {"", ".."} for part in pure.parts):
            raise SystemExit(f"Unsafe zip entry refused: {name}")
        mode = (info.external_attr >> 16) & 0o170000
        if mode == 0o120000:
            raise SystemExit(f"Symlink zip entry refused: {name}")
        destination = (target_dir / Path(*pure.parts)).resolve()
        try:
            destination.relative_to(target_dir)
        except ValueError:
            raise SystemExit(f"Zip entry escapes target directory: {name}")
    zf.extractall(target_dir)
PY
    return
  fi

  if have unzip; then
    while IFS= read -r entry; do
      case "$entry" in
        ""|/*|../*|*/../*|*"/.."|*"\\"*)
          warn "Unsafe zip entry refused: $entry"
          return 1
          ;;
      esac
    done < <(unzip -Z1 "$zip_path")
    unzip -q "$zip_path" -d "$target_dir"
    return
  fi

  warn "Need python3 or unzip to restore."
  return 1
}

confirm() {
  local prompt="$1"
  if [[ ! -t 0 ]]; then
    warn "$prompt Non-interactive shell; skipping."
    return 1
  fi
  read -r -p "$prompt [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]]
}

[[ -f "$ZIP_PATH" ]] || {
  warn "Export zip not found: $ZIP_PATH"
  warn "Upload codex-profile-export-redacted.zip to the repo root first."
  exit 1
}

mkdir -p "$RESTORE_WORK" "$HOME/.codex" "$HOME/.agents/skills"

safe_extract_zip "$ZIP_PATH" "$RESTORE_WORK" || exit 1

EXPORT_DIR="$RESTORE_WORK/.codex-profile-export"
[[ -d "$EXPORT_DIR" ]] || {
  warn "Zip did not contain .codex-profile-export."
  exit 1
}

restore_agents_file() {
  local source="$1"
  local target="$2"
  [[ -f "$source" ]] || return 0
  if [[ -f "$target" ]]; then
    warn "$target already exists."
    if have diff; then
      diff -u "$target" "$source" || true
    fi
    if confirm "Replace $target with exported file?"; then
      cp -p "$source" "$target"
      log "Replaced $target."
    else
      warn "Skipped $target."
    fi
  else
    cp -p "$source" "$target"
    log "Restored $target."
  fi
}

restore_skill_root() {
  local source_root="$1"
  local target_root="$2"
  [[ -d "$source_root" ]] || return 0
  mkdir -p "$target_root"
  while IFS= read -r -d '' skill_dir; do
    local name
    name="$(basename "$skill_dir")"
    if [[ -e "$target_root/$name" ]]; then
      warn "Skill already exists, leaving untouched: $target_root/$name"
      continue
    fi
    cp -R "$skill_dir" "$target_root/$name"
    log "Restored skill: $target_root/$name"
  done < <(find "$source_root" -mindepth 1 -maxdepth 1 -type d -print0)
}

restore_agents_file "$EXPORT_DIR/AGENTS.global.md" "$HOME/.codex/AGENTS.md"
restore_agents_file "$EXPORT_DIR/AGENTS.override.global.md" "$HOME/.codex/AGENTS.override.md"

restore_skill_root "$EXPORT_DIR/skills-user" "$HOME/.agents/skills"
restore_skill_root "$EXPORT_DIR/skills-repo" "$REPO_ROOT/.agents/skills"

if [[ -f "$EXPORT_DIR/config.redacted.toml" ]]; then
  TEMPLATE="$HOME/.codex/config.redacted.toml"
  cp -p "$EXPORT_DIR/config.redacted.toml" "$TEMPLATE"
  log "Copied redacted config template to $TEMPLATE."
  if [[ -f "$HOME/.codex/config.toml" ]]; then
    warn "~/.codex/config.toml already exists. Review and merge manually."
    if have diff; then
      diff -u "$HOME/.codex/config.toml" "$TEMPLATE" || true
    fi
  else
    cp -p "$TEMPLATE" "$HOME/.codex/config.toml.template"
    warn "No ~/.codex/config.toml exists. A template was written to ~/.codex/config.toml.template."
    warn "Review placeholders, fill env vars manually, then copy/merge to ~/.codex/config.toml."
  fi
fi

if have codex; then
  log "codex help:"
  codex --help 2>&1 | sed -n '1,20p'
  if codex mcp --help >/tmp/codex-mcp-help.$$ 2>&1; then
    log "codex mcp help:"
    sed -n '1,30p' /tmp/codex-mcp-help.$$
  else
    warn "codex mcp --help is not available or failed."
  fi
  rm -f /tmp/codex-mcp-help.$$
else
  warn "codex is not installed. Run ./scripts/bootstrap-devbox.sh first."
fi

cat <<'EOF'

[restore] Manual steps still required:

1. Authenticate tools:
   gh auth login
   tailscale up
   codex

2. Fill secrets manually:
   app/.env.local
   ~/.codex/config.toml or provider dashboards

3. For OAuth MCP servers, run the provider login flow, for example:
   codex mcp login <server-name>

4. Verify inside Codex:
   codex
   /skills
   /mcp

5. Run:
   ./scripts/verify-cloud-codex-skills.sh

EOF
