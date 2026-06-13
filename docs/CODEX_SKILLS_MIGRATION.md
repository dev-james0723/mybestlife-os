# Codex Skills Migration

Phone SSH access gets you onto the cloud devbox, but it does not bring your laptop's Codex profile with it. Codex CLI can only see files, skills, MCP config, shell tools, and secrets that exist on the machine where `codex` is running.

This repo now has a redacted export/import workflow so the cloud devbox can recover as much of your laptop Codex environment as possible without copying secrets.

## What each layer means

- Codex native skills: built-in or installed skill folders that Codex can discover on the current machine.
- Repo-level skills: project skills under `.agents/skills` in this repository.
- Project-local Codex skills: optional skills under `.codex/skills` in this repository, if that directory exists.
- User-level skills: personal skills under `~/.agents/skills` on the current machine.
- MCP servers: tool server definitions in Codex config, usually in `~/.codex/config.toml` or `.codex/config.toml`.
- Shell tools: commands the MCP servers and workflows depend on, such as `node`, `python3`, `docker`, `gh`, `vercel`, `supabase`, `tmux`, and `tailscale`.
- Project dependencies: npm packages and app dependencies installed by `./scripts/setup-mybestlife.sh`.
- Secrets: API keys, OAuth tokens, browser cookies, SSH private keys, `.env` values, and provider credentials. These must be recreated manually on the cloud devbox or in provider dashboards.

## Laptop export steps

Run these on the machine that currently has the working Codex setup:

```bash
cd /path/to/mybestlife-os
./scripts/inventory-codex-environment.sh
./scripts/export-codex-profile-redacted.sh
```

Outputs:

- `docs/CODEX_ENVIRONMENT_INVENTORY.md`
- `logs/codex-environment-inventory.txt`
- `.codex-profile-export/`
- `codex-profile-export-redacted.zip`

Review the export before moving it. It should contain redacted config, skills, tool versions, MCP server names, and required env variable names only.

The export script skips secret-like skill files by path, including `.env` files, OAuth material, cookies, tokens, credentials, private keys, `.pem`, `.p12`, and `.key` files. Skipped paths are listed in `.codex-profile-export/skipped-secret-like-files.txt` without printing their contents.

## Cloud import steps

Copy the redacted zip to the cloud devbox:

```bash
scp codex-profile-export-redacted.zip <user>@<server>:~/projects/mybestlife-os/
```

Then SSH in:

```bash
ssh <user>@<server>
cd ~/projects/mybestlife-os
./scripts/restore-codex-profile.sh
./scripts/verify-cloud-codex-skills.sh
```

The restore script does not restore secrets. If `~/.codex/config.toml` already exists, it leaves it in place and writes a redacted template for manual merge.

The verifier prints one of:

- `READY`: the local checks passed.
- `PARTIAL`: Codex can run, but some skills, MCP env vars, optional tools, or phone-workflow tools are missing.
- `BLOCKED`: Codex CLI or another required base layer is missing.

## Input Contract

Run the export steps from the laptop or source machine that already has the Codex profile you want to migrate. Run the restore and verify steps from the cloud devbox after `codex-profile-export-redacted.zip` has been uploaded to the repository root.

The restore workflow expects:

- `codex-profile-export-redacted.zip` in the repo root, unless you pass another zip path as the first argument.
- A cloned `mybestlife-os` repository.
- A shell user allowed to create `~/.codex` and `~/.agents/skills`.
- Manual access to account logins, OAuth approvals, 2FA, and secret values.

## Validation Gate

Use this gate to validate the migration before you rely on Codex from the phone.

Before treating the cloud setup as complete, run:

```bash
./scripts/verify-cloud-codex-skills.sh
./scripts/doctor.sh
```

Then start Codex from the repo root and check:

```text
/skills
/mcp
```

Do not call the migration complete while the verifier prints `BLOCKED`. Treat `PARTIAL` as usable only after you understand the listed missing items.

## Execution Modes

- Inventory is read-only reporting. It creates `docs/CODEX_ENVIRONMENT_INVENTORY.md` and `logs/codex-environment-inventory.txt`.
- Export is a redacted package build. It copies allowed skills and templates into `.codex-profile-export/` and `codex-profile-export-redacted.zip`.
- Restore is real local execution on the cloud devbox. It creates missing Codex directories, restores missing skills, and writes redacted config templates, but it does not restore secrets.
- Manual account login is always real execution and must be done by you: `gh auth login`, `tailscale up`, `codex`, and `codex mcp login <server-name>`.

## Receipt Paths

Use these files as handoff evidence for the next run:

- `docs/CODEX_ENVIRONMENT_INVENTORY.md`
- `logs/codex-environment-inventory.txt`
- `.codex-profile-export/README.md`
- `.codex-profile-export/mcp-servers.redacted.md`
- `.codex-profile-export/manual-secrets-needed.md`
- `.codex-profile-export/skipped-secret-like-files.txt`
- `codex-profile-export-redacted.zip`

## Phone workflow

1. Open Tailscale on the phone.
2. Open Termius or Blink Shell.
3. SSH into the cloud devbox:

```bash
ssh <user>@<tailscale-ip-or-hostname>
```

4. Attach the repo tmux session:

```bash
cd ~/projects/mybestlife-os
./scripts/mobile-ssh-start.sh
```

5. Start Codex:

```bash
codex
```

Inside Codex, verify:

```text
/skills
/mcp
```

## Manual steps

These steps cannot be safely automated:

```bash
gh auth login
tailscale up
codex
codex mcp login <server-name>
```

Also fill required env vars manually:

- `app/.env.local`
- provider dashboards such as Vercel, Supabase, Railway/Fly/Render, Google Cloud, Meta, Gemini, and similar
- `~/.codex/config.toml` placeholders if MCP servers need env vars

## Never copy

Do not copy these into Git or the redacted export:

- API keys
- OAuth tokens
- browser cookies
- SSH private keys
- `.env` files
- credentials files
- `.pem`, `.key`, `.p12`
- cloud billing credentials
- production database credentials

## Troubleshooting

Skill not showing:
Run `./scripts/verify-cloud-codex-skills.sh`, confirm the skill exists under `~/.agents/skills` or `.agents/skills`, then restart `codex`.

MCP server missing command:
Install the command shown by `./scripts/doctor.sh`. For example, install Node tools with npm/corepack, Python tools with pipx/uv, or provider CLIs with their official installer.

MCP server missing env var:
Set the named env var on the cloud devbox or in the provider dashboard. Never paste the value into chat.

Codex not reading `AGENTS.md`:
Confirm `~/.codex/AGENTS.md` exists for global instructions and repo `AGENTS.md` exists at the repository root. Restart `codex` from the repo root.

Package command missing:
Run `./scripts/setup-mybestlife.sh` and then `./scripts/doctor.sh`.

Permission denied:
Check execute bits with `ls -la scripts/*.sh`, then run `chmod +x scripts/*.sh`.

Tmux session stuck:
List sessions with `tmux ls`, attach with `tmux attach -t mybestlife`, or create a new session with `MYBESTLIFE_TMUX_SESSION=mybestlife-2 ./scripts/mobile-ssh-start.sh`.

## Readiness rule

Phone Codex CLI access will have the same practical skills only after:

- the redacted profile has been restored,
- missing shell tools are installed,
- MCP commands exist,
- required env vars are manually set,
- OAuth/device-code logins are completed,
- and `codex` is started from the repo root.

Without the repaired laptop or a backup export, user-level skills and global config that exist only on that laptop remain blocked.
