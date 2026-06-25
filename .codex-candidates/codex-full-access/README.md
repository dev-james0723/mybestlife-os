# Codex Full Access Candidate

Execution state: candidate only. This has not been applied.

## What This Enables

This candidate changes the repo-local Codex defaults from:

```toml
sandbox_mode = "workspace-write"
approval_policy = "on-request"
```

to:

```toml
sandbox_mode = "danger-full-access"
approval_policy = "never"
```

According to the current Codex manual, full access means using
`sandbox_mode = "danger-full-access"` together with `approval_policy = "never"`.

## One-Off Alternative

For a single new Codex session, start Codex with:

```bash
codex --dangerously-bypass-approvals-and-sandbox
```

or equivalently:

```bash
codex --sandbox danger-full-access --ask-for-approval never
```

## Boundaries

This does not bypass external OAuth, connector "Add connection", 2FA, workspace
admin policy, or app/MCP tool calls that the provider requires a human to
authorize.

## Candidate Patch

See `CONFIG_PATCH.diff`.
