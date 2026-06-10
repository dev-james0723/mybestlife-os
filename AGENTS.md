# My Best Life OS Agent Notes

## Project overview

My Best Life OS is a root wrapper repo with the main Next.js application in `app/`. The app uses Next.js 16, React 19, TypeScript, npm lockfiles, Supabase migrations/functions, and optional Python/Docker sidecars under `services/`.

Read `app/AGENTS.md` before editing app code. It contains a Next.js version warning for this project.

## Setup commands

```bash
./scripts/bootstrap-devbox.sh
./scripts/setup-mybestlife.sh
./scripts/doctor.sh
```

For day-to-day development:

```bash
npm run dev
```

The root package delegates to `app/`.

## Test, lint, typecheck, build

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run `./scripts/doctor.sh` before major work and after environment changes.

## Environment policy

- Never read, print, upload, commit, or expose real secrets.
- Never commit `.env`, `.env.local`, `.env*.local`, private keys, tokens, `.pem`, `.p12`, `.key`, or anything under `~/.ssh`.
- Use `app/.env.example` for variable names only.
- Put local values in `app/.env.local`.
- Put deployment values in the relevant provider dashboard.

## Safety rules

- Do not push without explicit user approval.
- Do not run production deploys, production migrations, destructive database commands, cloud billing changes, OAuth approval flows, or 2FA flows automatically.
- Do not delete files unless the user has reviewed the exact deletion list and approved it.
- Prefer small diffs.
- Prefer idempotent scripts and clear logs.

## Coding conventions

- Follow the existing TypeScript/React patterns in `app/src`.
- Keep Next.js work inside `app/` unless changing repo-level automation.
- Use npm for this repo; both root and `app/` have `package-lock.json`.
- Use Node 22 for parity with `app/.nvmrc`.
- Avoid broad refactors unless the task explicitly calls for them.

## Mobile/devbox workflow

Use Tailscale plus SSH from a phone, then attach tmux:

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
