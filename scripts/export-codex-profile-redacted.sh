#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
EXPORT_DIR="$REPO_ROOT/.codex-profile-export"
ZIP_PATH="$REPO_ROOT/codex-profile-export-redacted.zip"
TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"

log() {
  printf '[export] %s\n' "$*"
}

warn() {
  printf '[export][warn] %s\n' "$*" >&2
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

if [[ -e "$EXPORT_DIR" ]]; then
  ARCHIVE_DIR="$REPO_ROOT/.codex-profile-export.previous-$TIMESTAMP"
  log "Existing .codex-profile-export found; moving it to $(basename "$ARCHIVE_DIR")."
  mv "$EXPORT_DIR" "$ARCHIVE_DIR"
fi

if [[ -e "$ZIP_PATH" ]]; then
  ARCHIVE_ZIP="$REPO_ROOT/codex-profile-export-redacted.previous-$TIMESTAMP.zip"
  log "Existing export zip found; moving it to $(basename "$ARCHIVE_ZIP")."
  mv "$ZIP_PATH" "$ARCHIVE_ZIP"
fi

mkdir -p "$EXPORT_DIR"

redact_config() {
  local source="$1"
  local target="$2"
  if ! have python3; then
    warn "python3 missing; cannot redact $source"
    return
  fi
  python3 - "$source" "$target" <<'PY'
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])
SECRET_RE = re.compile(r"(secret|token|password|credential|bearer|api[_-]?key|private[_-]?key|cookie|auth)", re.I)
TOKEN_RE = re.compile(r"(sk-[A-Za-z0-9_-]+|gh[psou]_[A-Za-z0-9_]+|xox[baprs]-[A-Za-z0-9-]+|ya29\.[A-Za-z0-9_.-]+)")

def redact_line(line: str) -> str:
    if "=" not in line or line.lstrip().startswith("#"):
        return TOKEN_RE.sub("<REDACTED>", line)
    left, right = line.split("=", 1)
    if SECRET_RE.search(left):
        return f"{left}= \"<REDACTED>\"\n"
    redacted = TOKEN_RE.sub("<REDACTED>", right)
    redacted = re.sub(
        r"([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|CREDENTIAL|API_KEY|PRIVATE_KEY|COOKIE|AUTH)[A-Z0-9_]*\s*=\s*)\"[^\"]*\"",
        r'\1"<REDACTED>"',
        redacted,
        flags=re.I,
    )
    return left + "=" + redacted

target.write_text("".join(redact_line(line) for line in source.read_text(encoding="utf-8", errors="replace").splitlines(True)), encoding="utf-8")
PY
}

copy_if_exists() {
  local source="$1"
  local target="$2"
  if [[ -f "$source" ]]; then
    cp -p "$source" "$target"
    log "Copied $(basename "$source") to export."
  fi
}

is_secret_like_path() {
  local rel_lower
  rel_lower="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  case "$rel_lower" in
    .env|.env.*|.env/*|*/.env|*/.env.*|*/.env/*|\
    *token*|*oauth*|*cookie*|*secret*|*client_secret*|*client-secret*|\
    *service_account*|*service-account*|*credential*|*id_rsa*|*id_ed25519*|\
    *private*key*|*.pem|*.p12|*.key)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

file_contains_secret_value() {
  local file="$1"
  local byte_count
  byte_count="$(wc -c < "$file" | tr -d ' ')"
  if [[ "$byte_count" -gt 5000000 ]] || ! have python3; then
    return 1
  fi

  python3 - "$file" <<'PY'
import re
import sys
from pathlib import Path

data = Path(sys.argv[1]).read_bytes()
patterns = [
    re.compile(rb"(?<![A-Za-z0-9])sk-(?:proj-)?[A-Za-z0-9_-]{24,}"),
    re.compile(rb"(?<![A-Za-z0-9])gh[psou]_[A-Za-z0-9_]{24,}"),
    re.compile(rb"(?<![A-Za-z0-9])xox[baprs]-[A-Za-z0-9-]{24,}"),
    re.compile(rb"(?<![A-Za-z0-9])ya29\.[A-Za-z0-9_.-]{24,}"),
    re.compile(rb"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(rb"(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])"),
]
raise SystemExit(0 if any(pattern.search(data) for pattern in patterns) else 1)
PY
}

copy_skill_tree_safe() {
  local source_root="$1"
  local target_root="$2"
  local skipped_file="$3"
  mkdir -p "$target_root"
  if [[ ! -d "$source_root" ]]; then
    warn "Skill root missing: $source_root"
    return
  fi

  while IFS= read -r -d '' dir; do
    local rel_dir="${dir#$source_root/}"
    if [[ "$rel_dir" != "$dir" ]] && ! is_secret_like_path "$rel_dir"; then
      mkdir -p "$target_root/$rel_dir"
    fi
  done < <(find "$source_root" -type d -print0)

  while IFS= read -r -d '' file; do
    local rel="${file#$source_root/}"
    if is_secret_like_path "$rel"; then
      printf '%s\n' "$source_root/$rel" >> "$skipped_file"
      continue
    fi
    if file_contains_secret_value "$file"; then
      printf '%s (content pattern skipped)\n' "$source_root/$rel" >> "$skipped_file"
      continue
    fi
    if [[ -L "$file" ]]; then
      printf '%s (symlink skipped)\n' "$source_root/$rel" >> "$skipped_file"
      continue
    fi
    mkdir -p "$target_root/$(dirname "$rel")"
    cp -p "$file" "$target_root/$rel"
  done < <(find "$source_root" -type f -print0)
}

write_tool_versions() {
  local out="$EXPORT_DIR/tool-versions.txt"
  {
    printf 'Generated: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    for tool in node npm pnpm yarn bun python3 pip uv docker gh vercel supabase firebase netlify railway wrangler tailscale tmux rg jq cursor codex; do
      if command -v "$tool" >/dev/null 2>&1; then
        printf '%s: ' "$tool"
        case "$tool" in
          node|npm|pnpm|yarn|bun) first_line_command "$tool" --version ;;
          python3) first_line_command python3 --version ;;
          pip) first_line_command pip --version ;;
          docker) first_line_command docker --version ;;
          gh|vercel|supabase|firebase|netlify|railway|wrangler|codex) first_line_command "$tool" --version ;;
          tailscale) first_line_command tailscale version ;;
          tmux) first_line_command tmux -V ;;
          rg) first_line_command rg --version ;;
          jq) first_line_command jq --version ;;
          cursor) first_line_command cursor --version ;;
          uv) first_line_command uv --version ;;
        esac
        printf '\n'
      else
        printf '%s: missing\n' "$tool"
      fi
    done
  } > "$out"
}

write_mcp_summary() {
  local out="$EXPORT_DIR/mcp-servers.redacted.md"
  if ! have python3; then
    printf '# MCP Servers\n\npython3 missing; cannot parse MCP config.\n' > "$out"
    return
  fi
  python3 - "$HOME/.codex/config.toml" "$REPO_ROOT/.codex/config.toml" > "$out" <<'PY'
import re
import sys
from pathlib import Path

try:
    import tomllib
except Exception:
    tomllib = None

SECRET_RE = re.compile(r"(secret|token|password|credential|bearer|api[_-]?key|private[_-]?key)", re.I)

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

def redact_arg(arg, prev=""):
    s = str(arg)
    if SECRET_RE.search(prev) or SECRET_RE.search(s):
        return re.sub(r"=(.*)$", "=<redacted>", s) if "=" in s else "<redacted>"
    if re.search(r"^(sk-|gh[psou]_|xox[baprs]-|ya29\.)", s):
        return "<redacted>"
    return s

print("# MCP Servers Redacted")
print()
for path in sys.argv[1:]:
    p = Path(path)
    print(f"## `{p}`")
    if not p.exists():
        print("\nmissing\n")
        continue
    if tomllib is None:
        print("\ntomllib unavailable\n")
        continue
    try:
        data = tomllib.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception as exc:
        print(f"\nCould not parse TOML safely: {exc}\n")
        continue
    servers = collect_servers(data)
    if not servers:
        print("\nNo MCP servers detected.\n")
        continue
    for name, cfg in sorted(servers, key=lambda x: x[0].lower()):
        args = cfg.get("args", [])
        if not isinstance(args, list):
            args = [args]
        redacted_args = []
        prev = ""
        for arg in args:
            redacted_args.append(redact_arg(arg, prev))
            prev = str(arg)
        env_names = []
        env = cfg.get("env", {})
        if isinstance(env, dict):
            env_names.extend(str(k) for k in env)
        for key in ("env_vars", "required_env", "requiredEnv"):
            value = cfg.get(key, [])
            if isinstance(value, list):
                env_names.extend(str(v) for v in value)
        print(f"- Server: `{name}`")
        print(f"  Command: `{cfg.get('command', '')}`")
        print(f"  Args: `{' '.join(redacted_args)}`")
        print(f"  Required env names: {', '.join(sorted(set(env_names))) if env_names else 'none declared'}")
        print("  Manual auth: run provider-specific login or `codex mcp login <server-name>` if supported.")
    print()
PY
}

write_manual_secrets() {
  local out="$EXPORT_DIR/manual-secrets-needed.md"
  {
    cat <<'EOF'
# Manual Secrets Needed

No secret values are included in this export.

Fill these manually on the cloud devbox or provider dashboards as needed:

- GitHub auth: `gh auth login`
- Tailscale auth: `tailscale up`
- Codex sign-in: `codex`
- MCP OAuth: `codex mcp login <server-name>` when supported
- Project env values: `app/.env.local`
- Provider dashboards: Vercel, Supabase, Railway/Fly/Render, Google Cloud, Meta, Gemini, and similar

Required MCP env variable names found in config, if any, are listed in `mcp-servers.redacted.md`.
EOF
  } > "$out"
}

cat > "$EXPORT_DIR/README.md" <<'EOF'
# Redacted Codex Profile Export

This package is safe-by-default scaffolding for moving Codex instructions, skills, and MCP templates to a cloud devbox.

It intentionally excludes real secrets, OAuth tokens, browser cookies, SSH private keys, and `.env` values.

On the cloud devbox:

```bash
cd ~/projects/mybestlife-os
./scripts/restore-codex-profile.sh
./scripts/verify-cloud-codex-skills.sh
```

Then perform manual logins:

```bash
gh auth login
tailscale up
codex
```

Inside Codex, check:

```text
/skills
/mcp
```
EOF

copy_if_exists "$HOME/.codex/AGENTS.md" "$EXPORT_DIR/AGENTS.global.md"
copy_if_exists "$HOME/.codex/AGENTS.override.md" "$EXPORT_DIR/AGENTS.override.global.md"

if [[ -f "$HOME/.codex/config.toml" ]]; then
  redact_config "$HOME/.codex/config.toml" "$EXPORT_DIR/config.redacted.toml"
  log "Wrote redacted global Codex config."
else
  warn "No ~/.codex/config.toml found."
fi

SKIPPED="$EXPORT_DIR/skipped-secret-like-files.txt"
: > "$SKIPPED"
copy_skill_tree_safe "$HOME/.agents/skills" "$EXPORT_DIR/skills-user" "$SKIPPED"
copy_skill_tree_safe "$REPO_ROOT/.agents/skills" "$EXPORT_DIR/skills-repo" "$SKIPPED"

write_tool_versions
write_mcp_summary
write_manual_secrets

if [[ ! -s "$SKIPPED" ]]; then
  printf 'No secret-like skill files were skipped.\n' > "$SKIPPED"
fi

if have zip; then
  (cd "$REPO_ROOT" && zip -qr "$ZIP_PATH" .codex-profile-export)
elif have python3; then
  python3 - "$EXPORT_DIR" "$ZIP_PATH" <<'PY'
import sys
import zipfile
from pathlib import Path

root = Path(sys.argv[1])
zip_path = Path(sys.argv[2])
with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for path in root.rglob("*"):
        if path.is_file():
            zf.write(path, path.relative_to(root.parent))
PY
else
  warn "Neither zip nor python3 is available; export directory was created but no zip was generated."
fi

cat <<EOF

[export] Export directory: $EXPORT_DIR
[export] Export zip: $ZIP_PATH

Move it to the cloud devbox with one of:

  scp "$ZIP_PATH" <user>@<server>:~/projects/mybestlife-os/
  rsync -av "$ZIP_PATH" <user>@<server>:~/projects/mybestlife-os/

Then on the cloud devbox:

  cd ~/projects/mybestlife-os
  ./scripts/restore-codex-profile.sh
  ./scripts/verify-cloud-codex-skills.sh

Manual values still required:

  gh auth login
  tailscale up
  codex
  codex mcp login <server-name>   # for OAuth MCP servers, if supported
  fill app/.env.local manually

EOF
