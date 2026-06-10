#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

log() {
  printf '[bootstrap] %s\n' "$*"
}

warn() {
  printf '[bootstrap][warn] %s\n' "$*" >&2
}

die() {
  printf '[bootstrap][error] %s\n' "$*" >&2
  exit 1
}

have() {
  command -v "$1" >/dev/null 2>&1
}

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=()
else
  SUDO=(sudo)
fi

if [[ ! -r /etc/os-release ]]; then
  die "This bootstrap script targets Ubuntu/Debian cloud devboxes. /etc/os-release was not found."
fi

# shellcheck disable=SC1091
. /etc/os-release
case "${ID:-}:${ID_LIKE:-}" in
  *ubuntu* | *debian*) ;;
  *)
    die "Unsupported OS '${PRETTY_NAME:-unknown}'. Use Ubuntu 24.04 LTS or another Debian-based image."
    ;;
esac

have apt-get || die "apt-get is required on this devbox."
if [[ "${#SUDO[@]}" -gt 0 ]] && ! have sudo; then
  die "sudo is required when the script is not run as root."
fi

APT_UPDATED=0
apt_update() {
  if [[ "$APT_UPDATED" -eq 0 ]]; then
    log "Running apt-get update."
    "${SUDO[@]}" apt-get update
    APT_UPDATED=1
  fi
}

apt_install() {
  apt_update
  log "Installing apt packages: $*"
  DEBIAN_FRONTEND=noninteractive "${SUDO[@]}" apt-get install -y "$@"
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
    printf 'npm'
  fi
}

detect_node_major() {
  local spec=""
  local f
  for f in ".nvmrc" ".node-version" "app/.nvmrc" "app/.node-version"; do
    if [[ -f "$f" ]]; then
      spec="$(tr -d '[:space:]' < "$f")"
      break
    fi
  done
  if [[ -n "$spec" ]]; then
    printf '%s' "$spec" | sed -E 's/^v?([0-9]+).*/\1/'
  else
    printf '24'
  fi
}

install_node() {
  local node_major="$1"
  local current_major=""
  if have node; then
    current_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
  fi

  if [[ "$current_major" == "$node_major" ]]; then
    log "Node.js major $node_major is already installed."
    return
  fi

  log "Installing Node.js $node_major.x via NodeSource because the repo requests it."
  apt_install ca-certificates curl gnupg
  curl -fsSL "https://deb.nodesource.com/setup_${node_major}.x" -o /tmp/nodesource_setup.sh
  "${SUDO[@]}" -E bash /tmp/nodesource_setup.sh
  APT_UPDATED=0
  apt_install nodejs
}

install_github_cli() {
  if have gh; then
    log "GitHub CLI is already installed."
    return
  fi

  log "Installing GitHub CLI from the official apt repository."
  apt_install curl ca-certificates
  "${SUDO[@]}" mkdir -p -m 755 /etc/apt/keyrings
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | "${SUDO[@]}" tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
  "${SUDO[@]}" chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main\n' "$(dpkg --print-architecture)" \
    | "${SUDO[@]}" tee /etc/apt/sources.list.d/github-cli.list >/dev/null
  APT_UPDATED=0
  apt_install gh
}

repo_needs_docker() {
  find . -maxdepth 4 \( -name Dockerfile -o -name docker-compose.yml -o -name compose.yml -o -name compose.yaml \) -print -quit | grep -q .
}

install_docker() {
  if have docker; then
    log "Docker is already installed."
    return
  fi

  log "Installing Docker Engine because this repo contains Docker-based services."
  apt_install ca-certificates curl gnupg lsb-release
  "${SUDO[@]}" install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/"${ID}"/gpg \
    | "${SUDO[@]}" gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  "${SUDO[@]}" chmod a+r /etc/apt/keyrings/docker.gpg
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/%s %s stable\n' \
    "$(dpkg --print-architecture)" "$ID" "${VERSION_CODENAME:-noble}" \
    | "${SUDO[@]}" tee /etc/apt/sources.list.d/docker.list >/dev/null
  APT_UPDATED=0
  apt_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  local docker_user="${SUDO_USER:-${USER:-}}"
  if [[ -n "$docker_user" && "$docker_user" != "root" ]]; then
    log "Adding $docker_user to the docker group. Log out and back in before using docker without sudo."
    "${SUDO[@]}" usermod -aG docker "$docker_user"
  fi
}

install_tailscale() {
  if have tailscale; then
    log "Tailscale is already installed."
    return
  fi

  log "Installing Tailscale. Browser login is NOT run automatically."
  curl -fsSL https://tailscale.com/install.sh | sh
}

install_codex_cli() {
  if have codex; then
    log "Codex CLI is already installed."
    return
  fi

  log "Installing Codex CLI from the official standalone installer."
  if [[ ! -t 0 || "${CI:-}" == "true" ]]; then
    curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh
  else
    curl -fsSL https://chatgpt.com/codex/install.sh | sh
  fi
}

install_cursor_cli() {
  if [[ "${SKIP_CURSOR_CLI:-0}" == "1" ]]; then
    warn "Skipping Cursor CLI because SKIP_CURSOR_CLI=1."
    return
  fi
  if have cursor || have cursor-agent; then
    log "Cursor CLI appears to be installed."
    return
  fi

  log "Installing Cursor CLI. Set SKIP_CURSOR_CLI=1 to skip this optional step."
  curl https://cursor.com/install -fsS | bash
}

ROOT_PM="$(detect_package_manager "$REPO_ROOT")"
APP_PM="$(detect_package_manager "$REPO_ROOT/app")"
NODE_MAJOR="$(detect_node_major)"

log "Repo root: $REPO_ROOT"
log "Detected package managers: root=$ROOT_PM app=$APP_PM"
log "Detected Node.js major: $NODE_MAJOR"

apt_install git curl wget unzip ca-certificates build-essential tmux htop jq ripgrep fd-find nano
install_node "$NODE_MAJOR"

if [[ "$ROOT_PM" == "pnpm" || "$APP_PM" == "pnpm" || "$ROOT_PM" == "yarn" || "$APP_PM" == "yarn" ]]; then
  log "Enabling Corepack for pnpm/yarn package management."
  corepack enable
fi

if [[ "$ROOT_PM" == "pnpm" || "$APP_PM" == "pnpm" ]]; then
  log "Activating pnpm through Corepack."
  corepack prepare pnpm@latest --activate
fi

if find . -maxdepth 4 \( -name requirements.txt -o -name pyproject.toml \) -print -quit | grep -q .; then
  apt_install python3 python3-venv python3-pip pipx
else
  log "No Python project files detected near the repo root; skipping Python tooling."
fi

install_github_cli

if repo_needs_docker; then
  install_docker
else
  log "No Dockerfile or compose file detected; skipping Docker."
fi

install_tailscale
install_codex_cli
install_cursor_cli

mkdir -p "$HOME/projects"

cat <<'NEXT_STEPS'

[bootstrap] Manual next steps. Run these yourself when ready:

1. Authenticate GitHub CLI:
   gh auth login

2. Join the devbox to your tailnet:
   tailscale up

3. Sign in to Codex:
   codex

4. Copy real env values into app/.env.local or .env.
   Do not paste secrets into chat, commit them, or store them in docs.

5. Start a phone-friendly workspace:
   tmux new -s mybestlife

6. From this repo, finish setup:
   ./scripts/setup-mybestlife.sh
   ./scripts/doctor.sh

NEXT_STEPS
