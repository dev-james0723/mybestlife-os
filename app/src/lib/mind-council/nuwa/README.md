# Nuwa in Mind Council

Vendored on 2026-09-08 from the installed `huashu-nuwa` skill, upstream
[alchaincyf/nuwa-skill](https://github.com/alchaincyf/nuwa-skill), by
[Huashu (花叔)](https://x.com/AlchainHust). The original MIT license is included.
SKILL.md, the extraction framework, and the skill template are unmodified.

`load-guide.ts` loads the original research and synthesis instructions at runtime.
The app runs one grounded research call across Nuwa's six dimensions, then a
structured synthesis call. It does not claim to run the desktop skill's six
workers or interactive review checkpoints. Profile-only degradation is labeled.

The generated person-specific SKILL.md and research notes live inside the existing
account-owned `role_model_neural_skills.skill_json`; no filesystem writes or new
database migrations are needed in production. Chat fetches that saved package by
the authenticated user's ID. Legacy rows compile from their existing fields.

`conversation-contract.ts` adapts Nuwa's first-person conversation rules: the UI
provides one disclosure, replies apply the person's reasoning directly, identity
questions are answered truthfully, and requests to leave the role are respected.
