import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src/lib/mind-council/nuwa");
const cache = new Map<string, string>();
function read(name: string): string {
  if (!cache.has(name)) cache.set(name, readFileSync(path.join(root, name), "utf8"));
  return cache.get(name)!;
}

/** The actual vendored Nuwa methodology, adapted to the app's two API stages. */
export function loadNuwaGuide(stage: "research" | "synthesis"): string {
  const skill = read("SKILL.md");
  const start = skill.indexOf(stage === "research" ? "### Phase 1:" : "### Phase 2:");
  const end = skill.indexOf(stage === "research" ? "### Phase 1.5:" : "### Phase 2.5:", start);
  if (start < 0 || end < 0) throw new Error("nuwa_guide_section_missing");
  return [
    "NUWA METHODOLOGY — application runtime adaptation:",
    "Run only the requested stage. The application handles storage and review. Do not request interactive checkpoints, install skills, create files, or claim to have spawned agents. Cover the six research dimensions in a single grounded research pass; mark any gaps honestly.",
    skill.slice(start, end),
    ...(stage === "synthesis" ? [read("references/extraction-framework.md"), read("references/skill-template.md")] : []),
    "APPLICATION OUTPUT CONTRACT: Follow the JSON schema requested below for synthesis. The app compiles these fields into an executable SKILL.md. The chat UI supplies the single AI disclosure; ordinary persona replies use first person without repeating it.",
  ].join("\n\n");
}
