#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DOCS_DIR="$REPO_ROOT/docs"
LOGS_DIR="$REPO_ROOT/logs"
REPORT_MD="$DOCS_DIR/CODEX_ENVIRONMENT_INVENTORY.md"
REPORT_TXT="$LOGS_DIR/codex-environment-inventory.txt"

mkdir -p "$DOCS_DIR" "$LOGS_DIR"

have() {
  command -v "$1" >/dev/null 2>&1
}

safe_version() {
  local name="$1"
  shift
  if have "$name"; then
    "$@" 2>&1 | head -1
  else
    printf 'missing'
  fi
}

sanitize_remote() {
  sed -E \
    -e 's#(https?://)[^/@]+@#\1***@#g' \
    -e 's#(https?://[^/:]+:)[^@]+@#\1***@#g'
}

generate_report() {
  cat <<EOF
# Codex Environment Inventory

Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')

## Machine

- OS: $(if [[ -r /etc/os-release ]]; then . /etc/os-release && printf '%s' "${PRETTY_NAME:-unknown}"; elif have sw_vers; then printf '%s %s' "$(sw_vers -productName)" "$(sw_vers -productVersion)"; else uname -a; fi)
- Shell: ${SHELL:-unknown}
- User: $(id -un 2>/dev/null || whoami 2>/dev/null || printf 'unknown')
- Repo path: $REPO_ROOT
- Git remote:

\`\`\`text
$(cd "$REPO_ROOT" && git remote -v 2>/dev/null | sanitize_remote || printf 'missing')
\`\`\`

## Codex CLI

- codex path: $(command -v codex 2>/dev/null || printf 'missing')
- codex version: $(safe_version codex codex --version)

## Codex Config Presence

| Path | Status |
| --- | --- |
| ~/.codex/config.toml | $(if [[ -f "$HOME/.codex/config.toml" ]]; then printf 'present'; else printf 'missing'; fi) |
| ~/.codex/AGENTS.md | $(if [[ -f "$HOME/.codex/AGENTS.md" ]]; then printf 'present'; else printf 'missing'; fi) |
| ~/.codex/AGENTS.override.md | $(if [[ -f "$HOME/.codex/AGENTS.override.md" ]]; then printf 'present'; else printf 'missing'; fi) |
| .codex/config.toml | $(if [[ -f "$REPO_ROOT/.codex/config.toml" ]]; then printf 'present'; else printf 'missing'; fi) |

## Skills

EOF

  if have python3; then
    python3 - "$REPO_ROOT" "$HOME" <<'PY'
import os
import re
import sys
from pathlib import Path

repo = Path(sys.argv[1])
home = Path(sys.argv[2])
roots = [
    ("repo", repo / ".agents" / "skills"),
    ("user", home / ".agents" / "skills"),
    ("system", Path("/etc/codex/skills")),
]

def frontmatter(skill_md: Path):
    name = ""
    desc = ""
    try:
        text = skill_md.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return name, desc
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            fm = text[3:end].splitlines()
            for line in fm:
                if ":" not in line:
                    continue
                k, v = line.split(":", 1)
                key = k.strip().lower()
                val = v.strip().strip("\"'")
                if key == "name":
                    name = val
                elif key == "description":
                    desc = val
    if not name:
        m = re.search(r"^#\s+(.+)$", text, re.M)
        if m:
            name = m.group(1).strip()
    return name, desc

for label, root in roots:
    print(f"### {label} skills: `{root}`")
    if not root.exists():
        print("\nmissing\n")
        continue
    entries = [p for p in root.iterdir() if p.is_dir()]
    if not entries:
        print("\nnone\n")
        continue
    print("\n| Skill path | SKILL.md | Name | Description | scripts/ | references/ | assets/ | agents/openai.yaml |")
    print("| --- | --- | --- | --- | --- | --- | --- | --- |")
    for skill in sorted(entries, key=lambda p: str(p).lower()):
        md = skill / "SKILL.md"
        name, desc = frontmatter(md) if md.exists() else ("", "")
        rel = str(skill)
        values = [
            rel,
            "yes" if md.exists() else "no",
            name or "",
            desc or "",
            "yes" if (skill / "scripts").is_dir() else "no",
            "yes" if (skill / "references").is_dir() else "no",
            "yes" if (skill / "assets").is_dir() else "no",
            "yes" if (skill / "agents" / "openai.yaml").is_file() else "no",
        ]
        safe = [v.replace("|", "\\|").replace("\n", " ") for v in values]
        print("| " + " | ".join(safe) + " |")
    print()
PY
  else
    cat <<'EOF'
python3 is missing, so skill frontmatter could not be parsed.

EOF
  fi

  cat <<'EOF'
## MCP Configuration

EOF

  if have python3; then
    python3 - "$HOME/.codex/config.toml" "$REPO_ROOT/.codex/config.toml" <<'PY'
import os
import re
import sys
from pathlib import Path

try:
    import tomllib
except Exception:
    tomllib = None

SECRET_RE = re.compile(r"(secret|token|password|credential|bearer|api[_-]?key|private[_-]?key)", re.I)

def redact_arg(arg, previous=""):
    s = str(arg)
    if SECRET_RE.search(previous) or SECRET_RE.search(s):
        if "=" in s:
            return re.sub(r"=(.*)$", "=<redacted>", s)
        return "<redacted>"
    if re.search(r"^(sk-|gh[psou]_|xox[baprs]-|ya29\.)", s):
        return "<redacted>"
    return s

def collect_servers(obj, path=()):
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
            out.extend(collect_servers(value, path + (str(key),)))
    return out

def read_toml(path):
    p = Path(path)
    if not p.exists():
        return None
    if tomllib is None:
        return {}
    with p.open("rb") as fh:
        return tomllib.load(fh)

for path in sys.argv[1:]:
    print(f"### `{path}`")
    data = read_toml(path)
    if data is None:
        print("\nmissing\n")
        continue
    servers = collect_servers(data)
    if not servers:
        print("\nNo MCP servers detected.\n")
        continue
    print("\n| Server | Command | Args (redacted) | Required env names |")
    print("| --- | --- | --- | --- |")
    for name, cfg in sorted(servers, key=lambda item: item[0].lower()):
        command = str(cfg.get("command", ""))
        raw_args = cfg.get("args", [])
        if not isinstance(raw_args, list):
            raw_args = [raw_args]
        args = []
        prev = ""
        for arg in raw_args:
            args.append(redact_arg(arg, prev))
            prev = str(arg)
        env_names = []
        env = cfg.get("env", {})
        if isinstance(env, dict):
            env_names.extend(str(k) for k in env.keys())
        for key in ("env_vars", "required_env", "requiredEnv"):
            value = cfg.get(key, [])
            if isinstance(value, list):
                env_names.extend(str(v) for v in value)
        env_names = sorted(set(env_names))
        row = [
            name,
            command,
            " ".join(args),
            ", ".join(env_names) if env_names else "none declared",
        ]
        safe = [v.replace("|", "\\|").replace("\n", " ") for v in row]
        print("| " + " | ".join(safe) + " |")
    print()
PY
  else
    printf 'python3 is missing, so MCP config could not be parsed.\n\n'
  fi

  cat <<EOF
## Developer Tools

| Tool | Version / Status |
| --- | --- |
| node | $(safe_version node node --version) |
| npm | $(safe_version npm npm --version) |
| pnpm | $(safe_version pnpm pnpm --version) |
| yarn | $(safe_version yarn yarn --version) |
| bun | $(safe_version bun bun --version) |
| python3 | $(safe_version python3 python3 --version) |
| pip | $(safe_version pip pip --version) |
| uv | $(safe_version uv uv --version) |
| docker | $(safe_version docker docker --version) |
| docker compose | $(if have docker && docker compose version >/tmp/codex-inventory-docker-compose.$$ 2>&1; then head -1 /tmp/codex-inventory-docker-compose.$$; rm -f /tmp/codex-inventory-docker-compose.$$; else printf 'missing'; fi) |
| gh | $(safe_version gh gh --version) |
| vercel | $(safe_version vercel vercel --version) |
| supabase | $(safe_version supabase supabase --version) |
| firebase | $(safe_version firebase firebase --version) |
| netlify | $(safe_version netlify netlify --version) |
| railway | $(safe_version railway railway --version) |
| wrangler | $(safe_version wrangler wrangler --version) |
| tailscale | $(safe_version tailscale tailscale version) |
| tmux | $(safe_version tmux tmux -V) |
| rg | $(safe_version rg rg --version) |
| jq | $(safe_version jq jq --version) |
| cursor | $(safe_version cursor cursor --version) |

## Project Package Scripts

EOF

  if have python3; then
    python3 - "$REPO_ROOT/package.json" "$REPO_ROOT/app/package.json" <<'PY'
import json
import sys
from pathlib import Path

for path in sys.argv[1:]:
    p = Path(path)
    print(f"### `{p}`")
    if not p.exists():
        print("\nmissing\n")
        continue
    data = json.loads(p.read_text())
    scripts = data.get("scripts") or {}
    if not scripts:
        print("\nnone\n")
        continue
    for name in sorted(scripts):
        print(f"- {name}")
    print()
PY
  else
    printf 'python3 is missing, so package scripts could not be listed.\n\n'
  fi

  cat <<'EOF'
## Env File Presence

Values are intentionally hidden.

| Path | Status |
| --- | --- |
EOF
  for f in .env .env.local .env.example .env.local.example app/.env app/.env.local app/.env.example app/.env.local.example; do
    if [[ -f "$REPO_ROOT/$f" ]]; then
      printf '| `%s` | present |\n' "$f"
    else
      printf '| `%s` | missing |\n' "$f"
    fi
  done

  cat <<'EOF'

## Safety Notes

- Secret values, bearer tokens, OAuth tokens, cookies, and API keys were not printed.
- MCP env values are represented by variable names only.
- This report is safe to use as a setup receipt, but review it before sharing because it includes local paths and tool versions.
EOF
}

generate_report | tee "$REPORT_TXT" > "$REPORT_MD"

printf '[inventory] wrote %s\n' "$REPORT_MD"
printf '[inventory] wrote %s\n' "$REPORT_TXT"
