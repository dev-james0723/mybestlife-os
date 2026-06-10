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

if have unzip; then
  unzip -q "$ZIP_PATH" -d "$RESTORE_WORK"
elif have python3; then
  python3 - "$ZIP_PATH" "$RESTORE_WORK" <<'PY'
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as zf:
    zf.extractall(sys.argv[2])
PY
else
  warn "Need unzip or python3 to restore."
  exit 1
fi

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
