#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SESSION="${MYBESTLIFE_TMUX_SESSION:-mybestlife}"

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

pm="$(detect_package_manager "$REPO_ROOT")"
case "$pm" in
  npm) dev_cmd="npm run dev" ;;
  pnpm) dev_cmd="pnpm dev" ;;
  yarn) dev_cmd="yarn dev" ;;
  bun) dev_cmd="bun run dev" ;;
  *) dev_cmd="npm run dev" ;;
esac

cd "$REPO_ROOT"

cat <<EOF
[mobile] Repo: $REPO_ROOT
[mobile] Tmux session: $SESSION

Useful commands:
  $dev_cmd
  codex
  git status
  ./scripts/doctor.sh

EOF

if ! command -v tmux >/dev/null 2>&1; then
  echo "[mobile][error] tmux is not installed. Run ./scripts/bootstrap-devbox.sh on the devbox first." >&2
  exit 1
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux attach-session -t "$SESSION"
else
  tmux new-session -s "$SESSION" -c "$REPO_ROOT"
fi
