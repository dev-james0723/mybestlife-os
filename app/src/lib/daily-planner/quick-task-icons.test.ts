import { describe, expect, it } from "vitest";
import { buildLiquidGlassQuickTaskIconPrompt } from "./quick-task-icon-prompt";
import { normalizeQuickTasksJson } from "./normalize-quick-task";

describe("quick task AI icon prompts", () => {
  it("keeps custom task wording as the semantic source for Liquid Glass icons", () => {
    const prompt = buildLiquidGlassQuickTaskIconPrompt("Go back studio");

    expect(prompt).toContain("Go back studio");
    expect(prompt).toContain("Liquid Glass / glassmorphism");
    expect(prompt).toContain("exact task wording");
    expect(prompt).toContain("unique symbol/metaphor");
    expect(prompt).toContain("absolutely NO text");
  });
});

describe("quick task normalization", () => {
  it("preserves generated icon urls from camelCase and legacy snake_case rows", () => {
    const normalized = normalizeQuickTasksJson([
      {
        name: "Walk the dog",
        icon: "sparkles",
        blocks: 3,
        iconClass: "text-emerald-700",
        iconUrl: "https://storage.example.com/generated-dog.png",
      },
      {
        name: "Volleyball",
        icon: "sparkles",
        blocks: 3,
        iconClass: "text-sky-700",
        icon_url: "https://storage.example.com/generated-volleyball.png",
      },
    ]);

    expect(normalized?.map((task) => task.iconUrl)).toEqual([
      "https://storage.example.com/generated-dog.png",
      "https://storage.example.com/generated-volleyball.png",
    ]);
  });
});
