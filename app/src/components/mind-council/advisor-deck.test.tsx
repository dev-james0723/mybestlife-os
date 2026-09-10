import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdvisorPlayingCard } from "./AdvisorPlayingCard";
import { AdvisorPortrait } from "./AdvisorPortrait";
import { ReadySkillsSection } from "./ReadySkillsSection";
import { getMindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { getFeaturedPresetSkills } from "@/lib/mind-council/preset-skills";

vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ src, alt, sizes, className }: ComponentProps<"img">) =>
      createElement("img", { src, alt, sizes, className }),
  };
});

vi.mock("@/components/ui/os-primitives", async () => {
  const { createElement } = await import("react");
  const Button = ({ osSize, ...props }: ComponentProps<"button"> & { osSize?: string }) => {
    void osSize;
    return createElement("button", props);
  };
  return { OSControl: Button, OSPrimaryAction: Button };
});

const ui = getMindCouncilUiCopy("en");
const skills = getFeaturedPresetSkills();
const skill = skills[0]!;
const handlers = () => ({ onChat: vi.fn(), onAddCouncil: vi.fn(), onProfile: vi.fn() });

function findAction(node: ReactNode, label: string): { onClick?: () => void; disabled?: boolean } | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode; "aria-label"?: string; onClick?: () => void; disabled?: boolean }>(child)) continue;
    if (child.props["aria-label"]?.startsWith(`${label}:`)) return child.props;
    const nested = findAction(child.props.children, label);
    if (nested) return nested;
  }
  return undefined;
}

describe("featured advisor playing cards", () => {
  it("renders the complete deck with portraits and an accessible scroll region", () => {
    const html = renderToStaticMarkup(
      <ReadySkillsSection ui={ui} skills={skills} councilIds={[]} councilFull={false} {...handlers()} />,
    );
    expect(html.match(/<article\b/g)).toHaveLength(skills.length);
    expect(html.match(/<img\b/g)).toHaveLength(skills.length);
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain("Abstract avatars only");
    expect(html).toContain(ui.disclaimerShort);
  });

  it("preserves independent profile, chat, and add-to-council callbacks", () => {
    const callbacks = handlers();
    const tree = AdvisorPlayingCard({ skill, ui, index: 0, inCouncil: false, councilFull: false, ...callbacks });
    const profile = findAction(tree, ui.profileTitle);
    const chat = findAction(tree, ui.chatTitle);
    const add = findAction(tree, ui.addToCouncil);
    expect(profile).toBeDefined();
    expect(chat).toBeDefined();
    expect(add?.disabled).toBe(false);
    profile?.onClick?.();
    chat?.onClick?.();
    add?.onClick?.();
    expect(callbacks.onProfile).toHaveBeenCalledOnce();
    expect(callbacks.onChat).toHaveBeenCalledOnce();
    expect(callbacks.onAddCouncil).toHaveBeenCalledOnce();
  });

  it("disables adding when full without disabling profile or chat", () => {
    const tree = AdvisorPlayingCard({ skill, ui, index: 0, inCouncil: false, councilFull: true, ...handlers() });
    expect(findAction(tree, ui.addToCouncil)?.disabled).toBe(true);
    expect(findAction(tree, ui.chatTitle)?.disabled).not.toBe(true);
    expect(findAction(tree, ui.profileTitle)?.disabled).not.toBe(true);
  });

  it("marks members selected and prevents duplicate additions", () => {
    const props = { skill, ui, index: 0, inCouncil: true, councilFull: false, ...handlers() };
    expect(findAction(AdvisorPlayingCard(props), ui.currentCouncilTitle)?.disabled).toBe(true);
    expect(renderToStaticMarkup(<AdvisorPlayingCard {...props} />)).toContain('data-selected="true"');
  });

  it("gives fill images a real display box", () => {
    const html = renderToStaticMarkup(<AdvisorPortrait skill={skill} pixelSize={288} />);
    expect(html).toContain("inline-flex");
    expect(html).toContain('sizes="288px"');
    expect(html).toContain("/mind-council/portraits/");
  });

  it("keeps an accessible fallback when no portrait is mapped", () => {
    const html = renderToStaticMarkup(<AdvisorPortrait skill={{ ...skill, skillId: "custom-no-portrait" }} />);
    expect(html).toContain('role="img"');
    expect(html).toContain("aria-label=");
    expect(html).not.toContain("<img");
  });

  it("keeps decorative portrait fallbacks silent", () => {
    const html = renderToStaticMarkup(<AdvisorPortrait skill={{ ...skill, skillId: "custom-no-portrait" }} alt="" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
  });
});
