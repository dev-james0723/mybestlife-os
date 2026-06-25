# Deep Cultural Research Skill Candidate

Execution state: candidate only. Not installed.

## Source

- Source file: `/Users/ouxianxing/Downloads/human-terrain-analysis.md`
- Candidate file: `/Users/ouxianxing/My_life_os/.codex-candidates/deep-cultural-research/SKILL.md`
- Intended install directory: `/Users/ouxianxing/.codex/skills/deep-cultural-research`
- Skill front matter name: `deep-cultural-research`
- Skill version: `1.0.0`

## Validation

- Read the full 900-line source file.
- Checked candidate copy matches source exactly: `cmp_exit=0`
- SHA-256 source: `56bcbcfe17f5e78a1c9fb323ada4bce7af47fcb8a6b7b92f10f245de1b38f4ca`
- SHA-256 candidate: `56bcbcfe17f5e78a1c9fb323ada4bce7af47fcb8a6b7b92f10f245de1b38f4ca`
- Checked install destination does not exist: `/Users/ouxianxing/.codex/skills/deep-cultural-research`

## Commands Run

```bash
sed -n '1,240p' /Users/ouxianxing/.codex/skills/.system/skill-installer/SKILL.md
wc -l /Users/ouxianxing/Downloads/human-terrain-analysis.md
sed -n '1,220p' /Users/ouxianxing/Downloads/human-terrain-analysis.md
sed -n '221,500p' /Users/ouxianxing/Downloads/human-terrain-analysis.md
sed -n '501,800p' /Users/ouxianxing/Downloads/human-terrain-analysis.md
sed -n '801,980p' /Users/ouxianxing/Downloads/human-terrain-analysis.md
ls -la /Users/ouxianxing/.codex/skills
mkdir -p .codex-candidates/deep-cultural-research
cp /Users/ouxianxing/Downloads/human-terrain-analysis.md .codex-candidates/deep-cultural-research/SKILL.md
cmp -s /Users/ouxianxing/Downloads/human-terrain-analysis.md .codex-candidates/deep-cultural-research/SKILL.md
env LC_ALL=C LANG=C openssl dgst -sha256 /Users/ouxianxing/Downloads/human-terrain-analysis.md .codex-candidates/deep-cultural-research/SKILL.md
test -e /Users/ouxianxing/.codex/skills/deep-cultural-research
```

Note: an initial `shasum -a 256` check failed because the local Perl locale could not use `C.UTF-8`; `openssl dgst -sha256` succeeded.

## Pending Real Install

After explicit approval, install with:

```bash
mkdir -p /Users/ouxianxing/.codex/skills/deep-cultural-research
cp /Users/ouxianxing/My_life_os/.codex-candidates/deep-cultural-research/SKILL.md /Users/ouxianxing/.codex/skills/deep-cultural-research/SKILL.md
```

## Residual Risks

- The skill changes future Codex behavior for cultural research requests after Codex restarts.
- The skill uses current web research when needed, so answers may trigger browsing for culturally or politically current topics.
- No executable scripts or secret-handling instructions were found in the skill document.

## Next Action

User approval is required before writing to `/Users/ouxianxing/.codex/skills/deep-cultural-research`.
