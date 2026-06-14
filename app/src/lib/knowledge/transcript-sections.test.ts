import { describe, expect, it } from "vitest";
import { buildTranscriptSections } from "./transcript-sections";

describe("buildTranscriptSections", () => {
  it("splits a long one-line YouTube transcript into readable topic sections", () => {
    const transcript = [
      "Well, it is finally possible to code from anywhere with Claude Code. You can pull up Claude Code on your phone and start shipping features from anywhere. This opens up a quick handoff workflow from desktop to mobile. The remote control feature keeps the same session alive while you step away from your desk.",
      "Now the second workflow is starting a new session from your phone. You can spin up a new project, create the repository, and let the agent work while you are away. The important part is that mobile becomes a launcher for real work instead of just a viewer.",
      "Next we need to talk about power setup. Full remote access lets you connect back to the desktop machine, monitor the session, and intervene when a command needs approval. This is the fallback when the simple handoff is not enough.",
      "Finally, the course and examples show the exact patterns. The point is to stay ahead of the curve, keep builders moving, and make mobile access part of daily Claude Code practice.",
    ].join(" ");

    const sections = buildTranscriptSections(transcript);

    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections[0]?.title).toContain("Finally possible to code from anywhere");
    expect(sections[1]?.title).toContain("The second workflow is starting a new session");
    expect(sections.every((section) => section.body.length > 80)).toBe(true);
  });

  it("falls back to word chunks when captions have no punctuation", () => {
    const transcript = Array.from(
      { length: 210 },
      (_, index) => `word${index + 1}`,
    ).join(" ");

    const sections = buildTranscriptSections(transcript);

    expect(sections.length).toBeGreaterThan(1);
    expect(sections[0]?.title).toBe("Word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11...");
    expect(sections.map((section) => section.body).join(" ")).toContain("word210");
  });

  it("creates compact CJK section titles without losing transcript text", () => {
    const transcript =
      "首先我們會介紹如何整理逐字稿，讓使用者不用再面對一整堵文字。這一段會說明為什麼 topic heading 很重要。接著我們會把內容分段，並保留原本的句子。";

    const sections = buildTranscriptSections(transcript);

    expect(sections).toHaveLength(1);
    expect(sections[0]?.title.length).toBeLessThanOrEqual(27);
    expect(sections[0]?.body).toContain("topic heading");
  });
});
