# Cloud Codex Devbox Setup

This setup turns My Best Life OS into a reproducible cloud-devbox project that can be reached from a phone over SSH/Tailscale. It automates local machine preparation and repo setup, while leaving account, billing, OAuth, keys, and production actions in your hands.

## What this setup does

- Installs safe developer tooling on Ubuntu/Debian devboxes.
- Detects the repo package manager and Node version.
- Installs dependencies for the root wrapper package and the `app/` Next.js package.
- Creates local env files from examples only when missing.
- Runs local validation commands that already exist in the repo.
- Provides a phone-friendly tmux entrypoint.

It does not log in to accounts, create cloud resources, push to GitHub, run production migrations, deploy production, or place real secrets into files.

## Manual Step A: create cloud server

Create an Ubuntu server with this minimum spec:

- Ubuntu 24.04 LTS
- 2 vCPU minimum
- 4 GB RAM minimum
- 40 GB disk minimum

Use more RAM/disk if you plan to run Dockerized MinerU, local Supabase, browser tests, or TTS services on the same box.

## Manual Step B: add SSH key

Add your public SSH key to the cloud provider. Do not upload private keys. If you need a new key, generate it locally and add only the `.pub` value to the server/provider.

## Manual Step C: SSH into server

```bash
ssh <user>@<server-ip>
```

## Manual Step D: install Tailscale and run `tailscale up`

The bootstrap script installs Tailscale if missing, but it does not authenticate for you. After install:

```bash
tailscale up
```

Complete the browser login/2FA flow manually.

## Manual Step E: GitHub login with `gh auth login`

```bash
gh auth login
```

Complete GitHub authorization manually. Do not paste tokens into chat.

## Manual Step F: Codex login by running `codex`

```bash
codex
```

Complete any browser or device-code sign-in manually.

## Manual Step G: clone My Best Life OS

```bash
mkdir -p ~/projects
cd ~/projects
git clone <your-mybestlife-os-github-url> mybestlife-os
cd mybestlife-os
```

Use the real GitHub URL from your GitHub account. If the repo is private, authenticate with `gh auth login` first.

## Automated Step H

From the repository root:

```bash
./scripts/bootstrap-devbox.sh
./scripts/setup-mybestlife.sh
./scripts/doctor.sh
```

Run `bootstrap-devbox.sh` first on a fresh Ubuntu/Debian server. Run `setup-mybestlife.sh` after cloning the repo. Run `doctor.sh` any time something feels off.

## Automated Step I: migrate Codex skills and MCP templates

Project dependencies alone do not migrate your laptop Codex skills, global instructions, MCP servers, or user-level tools. Codex CLI only sees the machine where it is running.

On the laptop or source machine:

```bash
./scripts/inventory-codex-environment.sh
./scripts/export-codex-profile-redacted.sh
```

Move the generated package:

```bash
scp codex-profile-export-redacted.zip <user>@<server>:~/projects/mybestlife-os/
```

On the cloud devbox:

```bash
cd ~/projects/mybestlife-os
./scripts/restore-codex-profile.sh
./scripts/verify-cloud-codex-skills.sh
```

Then complete manual login and secret steps:

```bash
gh auth login
tailscale up
codex
codex mcp login <server-name>
```

More detail: [Codex Skills Migration](CODEX_SKILLS_MIGRATION.md).

`./scripts/verify-cloud-codex-skills.sh` reports `READY`, `PARTIAL`, or `BLOCKED` with reasons. Treat `PARTIAL` as a concrete to-do list for missing env vars, MCP commands, `tmux`, `tailscale`, or optional skill locations.

## Daily phone workflow

1. Open Tailscale on your phone.
2. Open Termius, Blink Shell, or another SSH app.
3. Connect:

```bash
ssh <user>@<tailscale-ip-or-hostname>
```

4. Enter the repo and attach the workspace:

```bash
cd ~/projects/mybestlife-os
./scripts/mobile-ssh-start.sh
```

Inside tmux, useful commands are:

```bash
npm run dev
codex
git status
./scripts/doctor.sh
```

## Recovery workflow if laptop dies

1. SSH to the Tailscale devbox from your phone or another machine.
2. Run:

```bash
cd ~/projects/mybestlife-os
git status
./scripts/doctor.sh
./scripts/mobile-ssh-start.sh
```

3. If dependencies are missing:

```bash
./scripts/setup-mybestlife.sh
```

4. Put missing secret values into `app/.env.local` manually. Never paste them into chat or commit them.

## How to add the next repo after My Best Life OS

```bash
cd ~/projects
git clone <next-repo-url>
cd <next-repo>
```

Then inspect the repo before automating:

```bash
pwd
git status --short
git remote -v
ls -la
find . -maxdepth 2 -type f | sort | sed 's#^\./##' | head -200
```

Copy the safe patterns from this repo only after confirming the stack, package manager, env policy, and test/build commands.

## What NOT to commit

Never commit:

- `.env`, `.env.local`, or any `.env*.local`
- API keys, tokens, OAuth client secrets, service role keys, database passwords
- SSH private keys or anything under `~/.ssh`
- `.pem`, `.p12`, `.key`, certificate private material
- Tailscale auth keys
- Production migration credentials
- Generated local run-state under `.codex/run-state/`
- Redacted profile export directories or zips unless you intentionally review and decide to version them

## Where to put secrets

Local development:

- `app/.env.local`
- Optional service-specific local env files that are already ignored

Cloud providers:

- Vercel project environment variables for the Next.js app
- Supabase dashboard for Supabase-managed secrets
- Railway/Fly/Render/VPS environment variables for Worker or TTS sidecars

Do not store real secrets in docs, examples, Git history, screenshots, tickets, or chat logs.

## Troubleshooting

Run:

```bash
./scripts/doctor.sh
```

Common fixes:

- Missing Node or wrong major: rerun `./scripts/bootstrap-devbox.sh`.
- Docker permission denied: log out and back in after the script adds your user to the `docker` group.
- GitHub CLI not authenticated: run `gh auth login`.
- Tailscale unavailable: run `tailscale up` and complete login manually.
- Codex unavailable: run `codex` and complete login manually.
- Codex skills unavailable on cloud: run the redacted export/restore workflow in `docs/CODEX_SKILLS_MIGRATION.md`.
- MCP server command missing: install the command reported by `./scripts/doctor.sh` or `./scripts/verify-cloud-codex-skills.sh`.
- MCP server env missing: set the named env var manually without printing its value.
- Missing env values: edit `app/.env.local`; keep values out of Git.
- Supabase migrations: do not run hosted `db push` until you intentionally choose the project and confirm the action.
- Vercel CLI old or missing: install or upgrade with `npm i -g vercel@latest` for the latest Codex/Vercel compatibility.
