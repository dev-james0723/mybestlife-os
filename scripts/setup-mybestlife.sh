#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="$REPO_ROOT/.codex/run-state"
STATUS_FILE="$STATE_DIR/setup-mybestlife-last-status.txt"
CURRENT_STEP="initializing"

mkdir -p "$STATE_DIR"

log() {
  printf '[setup] %s\n' "$*"
}

warn() {
  printf '[setup][warn] %s\n' "$*" >&2
}

die() {
  printf '[setup][error] %s\n' "$*" >&2
  exit 1
}

record_status() {
  local status="$1"
  {
    printf 'status=%s\n' "$status"
    printf 'last_step=%s\n' "$CURRENT_STEP"
    printf 'timestamp_utc=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  } > "$STATUS_FILE"
}

on_exit() {
  local exit_code=$?
  if [[ "$exit_code" -eq 0 ]]; then
    record_status "success"
    log "Setup completed successfully."
  else
    record_status "failed_exit_${exit_code}"
    warn "Setup failed during: $CURRENT_STEP"
    warn "Last status written to $STATUS_FILE"
  fi
}
trap on_exit EXIT

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
    printf 'npm'
  fi
}

pm_install() {
  local dir="$1"
  local pm="$2"
  CURRENT_STEP="install dependencies in ${dir#$REPO_ROOT/}"
  log "Installing dependencies in $dir with $pm."
  case "$pm" in
    npm)
      if [[ -f "$dir/package-lock.json" ]]; then
        (cd "$dir" && npm ci)
      else
        (cd "$dir" && npm install)
      fi
      ;;
    pnpm)
      (cd "$dir" && pnpm install --frozen-lockfile)
      ;;
    yarn)
      (cd "$dir" && yarn install --frozen-lockfile)
      ;;
    bun)
      (cd "$dir" && bun install --frozen-lockfile)
      ;;
    *)
      die "Unsupported package manager: $pm"
      ;;
  esac
}

package_has_script() {
  local dir="$1"
  local script="$2"
  PACKAGE_JSON="$dir/package.json" SCRIPT_NAME="$script" node -e '
    const fs = require("fs");
    const pkg = JSON.parse(fs.readFileSync(process.env.PACKAGE_JSON, "utf8"));
    process.exit(pkg.scripts && pkg.scripts[process.env.SCRIPT_NAME] ? 0 : 1);
  '
}

pm_run_script() {
  local dir="$1"
  local pm="$2"
  local script="$3"
  CURRENT_STEP="run $script in ${dir#$REPO_ROOT/}"
  log "Running $script in $dir."
  case "$pm" in
    npm) (cd "$dir" && npm run "$script") ;;
    pnpm) (cd "$dir" && pnpm "$script") ;;
    yarn) (cd "$dir" && yarn "$script") ;;
    bun) (cd "$dir" && bun run "$script") ;;
    *) die "Unsupported package manager: $pm" ;;
  esac
}

ensure_env_from_example() {
  local example="$1"
  local target="$2"
  if [[ -f "$target" ]]; then
    log "Env file exists; leaving it untouched: ${target#$REPO_ROOT/}"
  elif [[ -f "$example" ]]; then
    CURRENT_STEP="create ${target#$REPO_ROOT/} from ${example#$REPO_ROOT/}"
    cp "$example" "$target"
    chmod 600 "$target"
    warn "Created ${target#$REPO_ROOT/} from example with blank placeholders. Fill real values manually."
  else
    warn "No env example found at ${example#$REPO_ROOT/}; skipping ${target#$REPO_ROOT/} creation."
  fi
}

cd "$REPO_ROOT"

[[ -d .git ]] || die "Run this script from inside the My Best Life OS git checkout."
[[ -f package.json && -f app/package.json ]] || die "Expected root package.json and app/package.json."

REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$REMOTE_URL" != *"mybestlife-os"* && "$(basename "$REPO_ROOT")" != "My_life_os" ]]; then
  die "This does not look like My Best Life OS. Open the correct repo before running setup."
fi

ROOT_PM="$(detect_package_manager "$REPO_ROOT")"
APP_PM="$(detect_package_manager "$REPO_ROOT/app")"

log "Repo root: $REPO_ROOT"
log "Detected package managers: root=$ROOT_PM app=$APP_PM"

pm_install "$REPO_ROOT" "$ROOT_PM"
pm_install "$REPO_ROOT/app" "$APP_PM"

ensure_env_from_example "$REPO_ROOT/app/.env.example" "$REPO_ROOT/app/.env.local"
if [[ -f "$REPO_ROOT/.env.example" ]]; then
  ensure_env_from_example "$REPO_ROOT/.env.example" "$REPO_ROOT/.env.local"
fi

CURRENT_STEP="code generation detection"
if [[ -f "$REPO_ROOT/app/prisma/schema.prisma" ]] && package_has_script "$REPO_ROOT/app" "prisma:generate"; then
  pm_run_script "$REPO_ROOT/app" "$APP_PM" "prisma:generate"
elif [[ -f "$REPO_ROOT/app/prisma/schema.prisma" ]]; then
  warn "Prisma schema detected but no prisma:generate script exists; skipping."
fi

if [[ -d "$REPO_ROOT/app/supabase" ]]; then
  log "Supabase config/migrations detected. Skipping db push, link, and production migrations by policy."
fi

for script in lint typecheck test build; do
  if package_has_script "$REPO_ROOT/app" "$script"; then
    pm_run_script "$REPO_ROOT/app" "$APP_PM" "$script"
  else
    log "No app package script named '$script'; skipping."
  fi
done

log "Validation commands completed: lint/typecheck/test/build where available."
