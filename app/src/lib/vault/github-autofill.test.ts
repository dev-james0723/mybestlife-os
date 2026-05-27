import { describe, expect, it } from "vitest";
import {
  extractReadmeImageCandidates,
  resolveGitHubReadmeAssetUrl,
  type GitHubVaultRepoMeta,
} from "./github-autofill";

const meta: Pick<GitHubVaultRepoMeta, "owner" | "name" | "defaultBranch"> = {
  owner: "elirantutia",
  name: "vibeyard",
  defaultBranch: "main",
};

describe("github-autofill README asset parsing", () => {
  it("extracts markdown and HTML image candidates", () => {
    const markdown = `
![Vibeyard Logo](assets/icon.png)
<img alt="App screenshot" src="./assets/screenshot.png" />
`;

    expect(extractReadmeImageCandidates(markdown)).toEqual([
      { alt: "Vibeyard Logo", src: "assets/icon.png", index: 1 },
      { alt: "App screenshot", src: "./assets/screenshot.png", index: 35 },
    ]);
  });

  it("resolves relative README assets to raw GitHub URLs", () => {
    expect(resolveGitHubReadmeAssetUrl("assets/icon.png", meta)).toBe(
      "https://raw.githubusercontent.com/elirantutia/vibeyard/main/assets/icon.png",
    );
  });

  it("converts GitHub blob URLs to raw URLs", () => {
    expect(
      resolveGitHubReadmeAssetUrl(
        "https://github.com/elirantutia/vibeyard/blob/main/assets/logo.png",
        meta,
      ),
    ).toBe("https://raw.githubusercontent.com/elirantutia/vibeyard/main/assets/logo.png");
  });

  it("keeps remote image URLs intact", () => {
    expect(resolveGitHubReadmeAssetUrl("https://example.com/logo.svg", meta)).toBe(
      "https://example.com/logo.svg",
    );
  });
});
