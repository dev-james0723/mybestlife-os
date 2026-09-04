import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MindCouncilRichText } from "./MindCouncilRichText";

describe("MindCouncilRichText", () => {
  it("renders structured GitHub-flavoured Markdown", () => {
    const html = renderToStaticMarkup(
      <MindCouncilRichText
        source={"## Reframe\n\n- **Signal:** Keep it small\n- **Move:** Test it\n\n| Lens | Action |\n| --- | --- |\n| Craft | Iterate |"}
      />,
    );

    expect(html).toContain("<h2>");
    expect(html).toContain("<strong>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<table>");
  });

  it("does not execute raw HTML or load model-authored remote images", () => {
    const html = renderToStaticMarkup(
      <MindCouncilRichText
        source={'<script>alert("no")</script>\n\n![tracking pixel](https://example.com/pixel.png)'}
      />,
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("https://example.com/pixel.png");
    expect(html).toContain("tracking pixel");
  });
});
