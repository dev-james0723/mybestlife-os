#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

ok() {
  printf '[doctor][ok] %s\n' "$*"
}

warn() {
  printf '[doctor][warn] %s\n' "$*" >&2
}

info() {
  printf '[doctor] %s\n' "$*"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

sanitize_remote() {
  sed -E \
    -e 's#(https?://)[^/@]+@#\1***@#g' \
    -e 's#(https?://[^/:]+:)[^@]+@#\1***@#g'
}

version_line() {
  local name="$1"
  shift
  if have "$name"; then
    ok "$name: $("$@" 2>&1 | head -1)"
  else
    warn "$name: missing"
  fi
}

detect_package_manager() {
  local dir="$1"
  if [[ -f "$dir/pnpm-lock.yaml" ]]; then
    printf 'pnpm'
  elif [[ -f "$dir/yarn.lock" ]]; then
    printf 'yarn'
  elif [[ -f "$dir/bun.lockb" ]]; then
    printf 'bun'
  elif [[ -f "$dir/package-lock.json" ]]; then
    printf 'npm'
  else
    printf 'unknown'
  fi
}

check_port() {
  local port="$1"
  if have lsof; then
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      warn "port $port: in use"
      lsof -nP -iTCP:"$port" -sTCP:LISTEN | sed -n '1,3p'
    else
      ok "port $port: free"
    fi
  elif have ss; then
    if ss -ltn "( sport = :$port )" | tail -n +2 | grep -q .; then
      warn "port $port: in use"
    else
      ok "port $port: free"
    fi
  else
    warn "port $port: cannot check; install lsof or ss"
  fi
}

print_scripts() {
  local dir="$1"
  local label="$2"
  if [[ -f "$dir/package.json" ]] && have node; then
    info "$label package scripts:"
    PACKAGE_JSON="$dir/package.json" node -e '
      const fs = require("fs");
      const pkg = JSON.parse(fs.readFileSync(process.env.PACKAGE_JSON, "utf8"));
      for (const name of Object.keys(pkg.scripts || {}).sort()) {
        console.log(`  - ${name}`);
      }
    '
  fi
}

count_skill_dirs() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    find "$dir" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' '
  else
    printf '0'
  fi
}

report_skill_root() {
  local label="$1"
  local dir="$2"
  local count
  count="$(count_skill_dirs "$dir")"
  if [[ -d "$dir" ]]; then
    ok "$label skills: $count at $dir"
  else
    warn "$label skills: missing at $dir"
  fi
}

report_mcp_status() {
  info "Codex MCP status:"
  if [[ -f "$HOME/.codex/config.toml" ]]; then
    ok "global Codex config present: ~/.codex/config.toml"
  else
    warn "global Codex config missing: ~/.codex/config.toml"
  fi
  if [[ -f "$REPO_ROOT/.codex/config.toml" ]]; then
    ok "project Codex config present: .codex/config.toml"
  else
    warn "project Codex config missing: .codex/config.toml"
  fi

  if ! have python3; then
    warn "python3 missing; cannot parse MCP config"
    return
  fi

  local lines
  lines="$(python3 - "$HOME/.codex/config.toml" "$REPO_ROOT/.codex/config.toml" <<'PY'
import sys
from pathlib import Path

try:
    import tomllib
except Exception:
    print("WARN tomllib unavailable")
    raise SystemExit

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
        command = str(cfg.get("command", "")).strip()
        if command:
            print(f"COMMAND {name} {command}")
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

  local mcp_count="0"
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    local kind server value
    kind="$(printf '%s' "$line" | awk '{print $1}')"
    server="$(printf '%s' "$line" | awk '{print $2}')"
    value="$(printf '%s' "$line" | cut -d' ' -f3-)"
    case "$kind" in
      COUNT)
        mcp_count="$server"
        ;;
      COMMAND)
        if have "$value"; then
          ok "MCP command available for $server: $value"
        else
          warn "MCP command missing for $server: $value"
        fi
        ;;
      ENV)
        if [[ -n "${!value:-}" ]]; then
          ok "MCP env var present for $server: $value"
        else
          warn "MCP env var missing for $server: $value"
        fi
        ;;
      WARN)
        warn "${line#WARN }"
        ;;
    esac
  done <<< "$lines"

  if [[ "$mcp_count" == "0" ]]; then
    warn "No MCP servers detected in Codex config"
  else
    ok "MCP servers detected: $mcp_count"
  fi
}

report_phone_workflow() {
  info "Phone workflow readiness:"
  if have ssh; then
    ok "ssh installed"
  else
    warn "ssh missing"
  fi
  if have tmux; then
    ok "tmux installed"
  else
    warn "tmux missing"
  fi
  if have tailscale; then
    ok "tailscale installed"
  else
    warn "tailscale missing; install on cloud devbox and run tailscale up manually"
  fi
  if have codex; then
    ok "codex installed"
  else
    warn "codex missing"
  fi
  if [[ -x "$REPO_ROOT/scripts/mobile-ssh-start.sh" ]]; then
    ok "mobile startup script executable"
  else
    warn "mobile startup script is not executable"
  fi
}

info "Repo: $REPO_ROOT"

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  ok "OS: ${PRETTY_NAME:-unknown}"
elif have sw_vers; then
  ok "OS: $(sw_vers -productName) $(sw_vers -productVersion)"
else
  ok "OS: $(uname -a)"
fi

version_line git git --version
version_line node node --version
version_line npm npm --version

if [[ -f app/.nvmrc ]] && have node; then
  EXPECTED_NODE_MAJOR="$(tr -d '[:space:]v' < app/.nvmrc | sed -E 's/^([0-9]+).*/\1/')"
  CURRENT_NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
  if [[ -n "$EXPECTED_NODE_MAJOR" && "$CURRENT_NODE_MAJOR" != "$EXPECTED_NODE_MAJOR" ]]; then
    warn "node major mismatch: app/.nvmrc requests $EXPECTED_NODE_MAJOR, current node is $CURRENT_NODE_MAJOR"
  fi
fi

ROOT_PM="$(detect_package_manager "$REPO_ROOT")"
APP_PM="$(detect_package_manager "$REPO_ROOT/app")"
info "Package manager lockfiles: root=$ROOT_PM app=$APP_PM"

case "$ROOT_PM $APP_PM" in
  *pnpm*) version_line pnpm pnpm --version ;;
esac
case "$ROOT_PM $APP_PM" in
  *yarn*) version_line yarn yarn --version ;;
esac
case "$ROOT_PM $APP_PM" in
  *bun*) version_line bun bun --version ;;
esac

if find services -maxdepth 3 \( -name requirements.txt -o -name pyproject.toml \) -print -quit | grep -q .; then
  version_line python3 python3 --version
fi

if find . -maxdepth 4 \( -name Dockerfile -o -name docker-compose.yml -o -name compose.yml -o -name compose.yaml \) -print -quit | grep -q .; then
  version_line docker docker --version
fi

if have gh; then
  if gh auth status >/tmp/mybestlife-gh-status.$$ 2>&1; then
    ok "gh auth: authenticated"
  else
    warn "gh auth: not authenticated or unavailable"
  fi
  sed -E 's/[[:alnum:]_.+-]+@[[:alnum:].-]+/***@***/g' /tmp/mybestlife-gh-status.$$ \
    | grep -v 'Token:' \
    | sed -n '1,6p'
  rm -f /tmp/mybestlife-gh-status.$$
else
  warn "gh: missing"
fi

if have tailscale; then
  if tailscale status --self >/tmp/mybestlife-tailscale-status.$$ 2>&1; then
    ok "tailscale: self status available"
  elif tailscale status >/tmp/mybestlife-tailscale-status.$$ 2>&1; then
    ok "tailscale: status available"
  else
    warn "tailscale: installed but status failed"
  fi
  sed -n '1,5p' /tmp/mybestlife-tailscale-status.$$
  rm -f /tmp/mybestlife-tailscale-status.$$
else
  warn "tailscale: missing"
fi

if have codex; then
  ok "codex: $(codex --version 2>&1 | head -1)"
else
  warn "codex: missing"
fi

if have vercel; then
  VERCEL_VERSION="$(vercel --version 2>&1 | head -1)"
  ok "vercel: $VERCEL_VERSION"
  warn "Vercel CLI 54.11.1 or newer is recommended. Upgrade with: npm i -g vercel@latest"
else
  warn "vercel: missing"
fi

info "Git status:"
git status --short

info "Git remotes:"
git remote -v | sanitize_remote

info "Env file presence, values hidden:"
for f in .env .env.local app/.env app/.env.local app/.env.example app/.env.local.example; do
  if [[ -f "$f" ]]; then
    ok "$f present"
  else
    warn "$f missing"
  fi
done

info "Common local ports:"
for port in 3000 3100 3490 7860 8790 54321 54322 54323; do
  check_port "$port"
done

print_scripts "$REPO_ROOT" "root"
print_scripts "$REPO_ROOT/app" "app"

info "Codex skills status:"
if [[ -f "$HOME/.codex/AGENTS.md" ]]; then
  ok "global AGENTS present: ~/.codex/AGENTS.md"
else
  warn "global AGENTS missing: ~/.codex/AGENTS.md"
fi
if [[ -f "$HOME/.codex/AGENTS.override.md" ]]; then
  ok "global AGENTS override present: ~/.codex/AGENTS.override.md"
else
  warn "global AGENTS override missing: ~/.codex/AGENTS.override.md"
fi
report_skill_root "user" "$HOME/.agents/skills"
report_skill_root "repo" "$REPO_ROOT/.agents/skills"
report_skill_root "project" "$REPO_ROOT/.codex/skills"
report_skill_root "system" "/etc/codex/skills"

report_mcp_status
report_phone_workflow

STATUS_FILE="$REPO_ROOT/.codex/run-state/setup-mybestlife-last-status.txt"
if [[ -f "$STATUS_FILE" ]]; then
  info "Last setup result:"
  sed -n '1,20p' "$STATUS_FILE"
else
  warn "No persisted setup result yet. Run ./scripts/setup-mybestlife.sh first."
fi

info "Doctor finished. No secret values were printed."
