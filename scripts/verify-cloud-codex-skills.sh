#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

STATUS="READY"
REASONS=()

ok() {
  printf '[verify][ok] %s\n' "$*"
}

warn() {
  printf '[verify][warn] %s\n' "$*" >&2
  if [[ "$STATUS" == "READY" ]]; then
    STATUS="PARTIAL"
  fi
  REASONS+=("$*")
}

block() {
  printf '[verify][blocked] %s\n' "$*" >&2
  STATUS="BLOCKED"
  REASONS+=("$*")
}

have() {
  command -v "$1" >/dev/null 2>&1
}

first_line_command() {
  local output
  set +e
  output="$("$@" 2>&1)"
  set -e
  output="${output%%$'\n'*}"
  printf '%s' "$output"
}

command_available() {
  local command_name="$1"
  [[ -n "$command_name" ]] || return 1
  command -v "$command_name" >/dev/null 2>&1 || [[ -x "$command_name" ]]
}

count_skills() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    find "$dir" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' '
  else
    printf '0'
  fi
}

list_skill_names() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    printf '  missing\n'
    return
  fi
  find "$dir" -mindepth 1 -maxdepth 1 -type d -print | sort | sed 's#^.*/#  - #'
}

if have codex; then
  ok "Codex CLI installed: $(first_line_command codex --version)"
else
  block "Codex CLI missing"
fi

if [[ -f "$HOME/.codex/AGENTS.md" ]]; then
  ok "~/.codex/AGENTS.md exists"
else
  warn "~/.codex/AGENTS.md missing"
fi

if [[ -d "$HOME/.agents/skills" ]]; then
  ok "~/.agents/skills exists ($(count_skills "$HOME/.agents/skills") skills)"
else
  warn "~/.agents/skills missing"
fi

printf '[verify] User skills:\n'
list_skill_names "$HOME/.agents/skills"
printf '[verify] Repo skills:\n'
list_skill_names "$REPO_ROOT/.agents/skills"
printf '[verify] Project skills:\n'
list_skill_names "$REPO_ROOT/.codex/skills"

if [[ -f "$HOME/.codex/config.toml" || -f "$REPO_ROOT/.codex/config.toml" ]]; then
  ok "MCP/Codex config file present"
else
  warn "No ~/.codex/config.toml or .codex/config.toml found"
fi

if have python3; then
  MCP_CHECK_OUTPUT="$(python3 - "$HOME/.codex/config.toml" "$REPO_ROOT/.codex/config.toml" <<'PY'
import os
import sys
from pathlib import Path

try:
    import tomllib
except Exception:
    tomllib = None

def collect_servers(obj):
    out = []
    if not isinstance(obj, dict):
        return out
    for key, value in obj.items():
        normalized = str(key).replace("-", "_").lower()
        if normalized in {"mcp_servers", "mcpservers", "mcp"} and isinstance(value, dict):
            for name, cfg in value.items():
                if isinstance(cfg, dict):
                    out.append((str(name), cfg))
        elif isinstance(value, dict):
            out.extend(collect_servers(value))
    return out

if tomllib is None:
    print("WARN tomllib unavailable")
    raise SystemExit

count = 0
for path in sys.argv[1:]:
    p = Path(path)
    if not p.exists():
        continue
    try:
        data = tomllib.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception as exc:
        print(f"WARN could not parse {p}: {exc}")
        continue
    for name, cfg in collect_servers(data):
        count += 1
        cmd = str(cfg.get("command", "")).strip()
        if cmd:
            print(f"COMMAND {name} {cmd}")
        env = cfg.get("env", {})
        if isinstance(env, dict):
            for key in sorted(env):
                print(f"ENV {name} {key}")
        for key in ("env_vars", "required_env", "requiredEnv"):
            value = cfg.get(key, [])
            if isinstance(value, list):
                for item in value:
                    print(f"ENV {name} {item}")
print(f"COUNT {count}")
PY
)"
  MCP_COUNT="0"
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    kind="$(printf '%s' "$line" | awk '{print $1}')"
    server="$(printf '%s' "$line" | awk '{print $2}')"
    value="$(printf '%s' "$line" | cut -d' ' -f3-)"
    case "$kind" in
      COUNT)
        MCP_COUNT="$server"
        ;;
      COMMAND)
        if command_available "$value"; then
          ok "MCP command for $server is installed: $value"
        else
          warn "MCP command for $server is missing: $value"
        fi
        ;;
      ENV)
        if [[ -n "${!value:-}" ]]; then
          ok "MCP env var is set for $server: $value"
        else
          warn "MCP env var is missing for $server: $value"
        fi
        ;;
      WARN)
        warn "$line"
        ;;
    esac
  done <<< "$MCP_CHECK_OUTPUT"
  if [[ "$MCP_COUNT" == "0" ]]; then
    warn "No MCP servers detected in Codex config"
  else
    ok "MCP servers detected: $MCP_COUNT"
  fi
else
  warn "python3 missing; cannot parse MCP config"
fi

if [[ -d node_modules && -d app/node_modules ]]; then
  ok "My Best Life OS dependencies are installed"
else
  warn "Dependencies missing; run ./scripts/setup-mybestlife.sh"
fi

if [[ -f package-lock.json && -f app/package-lock.json ]]; then
  ok "Package manager: npm lockfiles present"
else
  warn "Expected npm lockfiles missing"
fi

if have codex; then
  if codex --help >/tmp/codex-verify-help.$$ 2>&1; then
    ok "Codex command responds from repo root"
  else
    warn "Codex command exists but help failed from repo root"
  fi
  rm -f /tmp/codex-verify-help.$$
fi

if have tmux; then
  ok "tmux installed"
else
  warn "tmux missing"
fi

if have tailscale; then
  ok "tailscale installed"
else
  warn "tailscale missing"
fi

printf '\n[verify] RESULT: %s\n' "$STATUS"
if [[ "${#REASONS[@]}" -gt 0 ]]; then
  printf '[verify] Reasons:\n'
  for reason in "${REASONS[@]}"; do
    printf '  - %s\n' "$reason"
  done
fi

case "$STATUS" in
  READY) exit 0 ;;
  PARTIAL) exit 0 ;;
  BLOCKED) exit 2 ;;
esac
