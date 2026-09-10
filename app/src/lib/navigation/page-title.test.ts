import { describe, expect, it } from "vitest";
import {
  findNavigationItemForPathname,
  resolveThemedPageTitle,
} from "@/lib/navigation/page-title";
import { UI_THEMES } from "@/lib/theme-config";

const baseOptions = {
  uiTheme: "default" as const,
  language: "en" as const,
};

describe("page title navigation resolution", () => {
  it("uses the explicit title for the Career root instead of the Home Page nav label", () => {
    expect(
      resolveThemedPageTitle({
        ...baseOptions,
        pathname: "/en/career",
        fallbackTitle: "Career Command Center",
      }),
    ).toBe("Career Command Center");
  });

  it("matches exact nested Career nav items by full path", () => {
    expect(findNavigationItemForPathname("/en/career/timeline")?.itemId).toBe(
      "career-timeline",
    );
    expect(
      resolveThemedPageTitle({
        ...baseOptions,
        pathname: "/en/career/timeline",
        fallbackTitle: "Career Timeline",
      }),
    ).toBe("Timeline");
  });

  it("does not collapse Career child pages to the root Career item", () => {
    expect(
      resolveThemedPageTitle({
        ...baseOptions,
        pathname: "/career/pipeline",
        fallbackTitle: "Career Pipeline",
      }),
    ).toBe("Pipeline");
  });

  it("falls back to explicit titles for deeply nested Career routes", () => {
    expect(findNavigationItemForPathname("/en/career/vault/file-123")).toBeNull();
    expect(
      resolveThemedPageTitle({
        ...baseOptions,
        pathname: "/en/career/vault/file-123",
        fallbackTitle: "Resume.pdf",
      }),
    ).toBe("Resume.pdf");
  });

  it("keeps the relationship hub category title behavior", () => {
    expect(
      resolveThemedPageTitle({
        ...baseOptions,
        pathname: "/en/relationship",
        fallbackTitle: "Relationships",
      }),
    ).toBe("People");
  });

  it.each([
    ["/en/dashboard", "Dashboard"],
    ["/en/journal", "Journal"],
    ["/en/career/timeline", "Timeline"],
    ["/en/vault", "Tools & Subscriptions"],
  ])("keeps %s on the Default-theme title across every visual theme", (pathname, title) => {
    for (const uiTheme of UI_THEMES) {
      expect(
        resolveThemedPageTitle({
          pathname,
          fallbackTitle: "Fallback",
          uiTheme,
          language: "en",
        }),
      ).toBe(title);
    }
  });

  it("keeps localized page names theme-invariant", () => {
    for (const uiTheme of UI_THEMES) {
      expect(
        resolveThemedPageTitle({
          pathname: "/zh-hk/dashboard",
          fallbackTitle: "後備標題",
          uiTheme,
          language: "zh-TW",
        }),
      ).toBe("儀表板");
    }
  });
});
