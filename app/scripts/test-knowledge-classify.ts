/**
 * Lightweight test runner for the pure knowledge classification + labels
 * modules. Follows the same pattern as `scripts/test-bio-lab-pure.ts`: no
 * external test framework required, uses `node --experimental-strip-types`.
 *
 * Usage (from app/):
 *   node --experimental-strip-types scripts/test-knowledge-classify.ts
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — at least one assertion failed (details printed)
 */

import assert from "node:assert/strict";

import {
  classifyKnowledgeInput,
  classifyUrl,
  classifyText,
} from "../src/lib/knowledge/classify.ts";
import {
  getSourceTypeInfo,
  getCategoryLabel,
  SOURCE_TYPE_INFO_LIST,
} from "../src/lib/knowledge/labels.ts";
import {
  detectCodeLanguage,
  looksLikeMarkdown,
  looksLikeSourceCode,
  supportsPreview,
  parseKnowledgeRawContent,
  encodeCodeContent,
} from "../src/lib/knowledge/code-content.ts";
import {
  contentTypeForSourceType,
  contentTypeForUrlHint,
} from "../src/types/knowledge.ts";

// ── Tiny harness ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    process.stdout.write(`  ok  ${name}\n`);
  } catch (err) {
    failed += 1;
    process.stdout.write(`  FAIL ${name}\n`);
    if (err instanceof Error) {
      process.stdout.write(`       ${err.message.split("\n").join("\n       ")}\n`);
    } else {
      process.stdout.write(`       ${String(err)}\n`);
    }
  }
}

function group(name: string, cb: () => void): void {
  process.stdout.write(`\n# ${name}\n`);
  cb();
}

// ── URL classification ───────────────────────────────────────────────────

group("classifyUrl — articles", () => {
  check("detects article for unknown host", () => {
    const result = classifyUrl("https://example.com/foo/bar");
    assert.equal(result?.sourceType, "article_url");
    assert.equal(result?.provider, "web");
    assert.equal(result?.category, "article");
    assert.equal(result?.askEnabled, true);
  });

  check("detects article for The New York Times", () => {
    const result = classifyUrl("https://www.nytimes.com/2024/01/01/world/article.html");
    assert.equal(result?.sourceType, "article_url");
  });

  check("returns null for non-URL input", () => {
    const result = classifyUrl("hello world");
    assert.equal(result, null);
  });
});

group("classifyUrl — YouTube", () => {
  check("detects standard YouTube video", () => {
    const result = classifyUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(result?.sourceType, "youtube_video");
    assert.equal(result?.provider, "youtube");
    assert.equal(result?.category, "video");
    assert.equal(result?.label, "YouTube Video");
    assert.equal(result?.askEnabled, true);
  });

  check("detects YouTube Shorts", () => {
    const result = classifyUrl("https://youtube.com/shorts/abcdefghijk");
    assert.equal(result?.sourceType, "youtube_shorts");
    assert.equal(result?.label, "YouTube Shorts");
  });

  check("detects youtu.be short link", () => {
    const result = classifyUrl("https://youtu.be/dQw4w9WgXcQ");
    assert.equal(result?.sourceType, "youtube_video");
  });
});

group("classifyUrl — GitHub", () => {
  check("detects repository URL", () => {
    const result = classifyUrl("https://github.com/vercel/next.js");
    assert.equal(result?.sourceType, "github_repository");
    assert.equal(result?.provider, "github");
    assert.equal(result?.category, "repository");
    assert.equal(result?.metadata.owner, "vercel");
    assert.equal(result?.metadata.repo, "next.js");
  });

  check("does NOT detect github.com/features as a repo", () => {
    const result = classifyUrl("https://github.com/features");
    // features is on the reserved list → falls through to article.
    assert.equal(result?.sourceType, "article_url");
  });
});

group("classifyUrl — social media", () => {
  check("detects X post", () => {
    const result = classifyUrl("https://x.com/elonmusk/status/1234567890");
    assert.equal(result?.sourceType, "social_x_post");
    assert.equal(result?.provider, "x");
    assert.equal(result?.category, "social_media");
    assert.equal(result?.label, "X Post");
    assert.equal(result?.askEnabled, false);
  });

  check("detects X video post", () => {
    const result = classifyUrl("https://x.com/user/status/123/video/1");
    assert.equal(result?.label, "X Video Post");
  });

  check("detects Twitter.com legacy host", () => {
    const result = classifyUrl("https://twitter.com/user/status/123");
    assert.equal(result?.provider, "x");
    assert.equal(result?.sourceType, "social_x_post");
  });

  check("detects Instagram post", () => {
    const result = classifyUrl("https://www.instagram.com/p/ABC123/");
    assert.equal(result?.sourceType, "social_instagram_post");
    assert.equal(result?.label, "Instagram Post");
  });

  check("detects Instagram Reel", () => {
    const result = classifyUrl("https://www.instagram.com/reel/XYZ789/");
    assert.equal(result?.sourceType, "social_instagram_reel");
    assert.equal(result?.label, "Instagram Reel");
  });

  check("detects Facebook post", () => {
    const result = classifyUrl("https://www.facebook.com/somepage/posts/123");
    assert.equal(result?.sourceType, "social_facebook_post");
  });

  check("detects Facebook video", () => {
    const result = classifyUrl("https://fb.watch/abcdef/");
    assert.equal(result?.sourceType, "social_facebook_video_post");
  });

  check("detects Reddit post", () => {
    const result = classifyUrl(
      "https://www.reddit.com/r/webdev/comments/abc123/how_do_i_x/",
    );
    assert.equal(result?.sourceType, "social_reddit_post");
    assert.equal(result?.metadata.subreddit, "r/webdev");
  });

  check("all social types set askEnabled=false", () => {
    const urls = [
      "https://x.com/u/status/1",
      "https://www.facebook.com/post/1",
      "https://www.instagram.com/p/abc/",
      "https://www.reddit.com/r/x/comments/1/y/",
    ];
    for (const u of urls) {
      const r = classifyUrl(u);
      assert.equal(r?.askEnabled, false, `expected askEnabled=false for ${u}`);
    }
  });
});

// ── Text classification ──────────────────────────────────────────────────

group("classifyText", () => {
  check("plain text is fallback", () => {
    const result = classifyText("Hello world, just thinking out loud today.");
    assert.equal(result.sourceType, "plain_text");
    assert.equal(result.supportsPreview, false);
    assert.equal(result.defaultDisplayMode, "source");
  });

  check("detects HTML", () => {
    const result = classifyText("<!doctype html><html><body><h1>Hi</h1></body></html>");
    assert.equal(result.sourceType, "html_input");
    assert.equal(result.supportsPreview, true);
    assert.equal(result.defaultDisplayMode, "preview");
  });

  check("detects Markdown with headings + lists", () => {
    const md = "# Hello\n\n- Item 1\n- Item 2\n\n[link](https://x.com)";
    const result = classifyText(md);
    assert.equal(result.sourceType, "markdown_input");
    assert.equal(result.supportsPreview, true);
    assert.equal(result.defaultDisplayMode, "preview");
  });

  check("detects Python", () => {
    const result = classifyText("def greet():\n    print('hi')\n");
    assert.equal(result.sourceType, "code_python");
    assert.equal(result.supportsPreview, false);
  });

  check("detects JavaScript", () => {
    const result = classifyText(
      "function add(a, b) { return a + b; }\nconst y = add(1, 2);",
    );
    assert.equal(result.sourceType, "code_javascript");
  });

  check("detects TypeScript", () => {
    const result = classifyText(
      "interface User { id: string; name: string; }\nconst u: User = { id: '', name: '' };",
    );
    assert.equal(result.sourceType, "code_typescript");
  });

  check("detects Java", () => {
    const result = classifyText(
      "public class Foo { public static void main(String[] args) { System.out.println(\"hi\"); } }",
    );
    assert.equal(result.sourceType, "code_java");
  });

  check("detects PHP", () => {
    const result = classifyText('<?php echo "hello"; ?>');
    assert.equal(result.sourceType, "code_php");
  });

  check("detects CSS", () => {
    const result = classifyText(".container { display: flex; gap: 12px; }\n");
    assert.equal(result.sourceType, "code_css");
  });

  check("short prose does NOT become markdown", () => {
    const result = classifyText("just a short note");
    assert.equal(result.sourceType, "plain_text");
  });
});

group("classifyKnowledgeInput — combined", () => {
  check("URL input uses URL classifier", () => {
    const result = classifyKnowledgeInput("https://github.com/vercel/next.js");
    assert.equal(result.sourceType, "github_repository");
  });

  check("empty input returns plain text", () => {
    const result = classifyKnowledgeInput("");
    assert.equal(result.sourceType, "plain_text");
  });

  check("text input uses text classifier", () => {
    const result = classifyKnowledgeInput("# Header\n\n- point a\n- point b");
    assert.equal(result.sourceType, "markdown_input");
  });
});

// ── Labels / presentation ────────────────────────────────────────────────

group("labels", () => {
  check("every SourceType has a SourceTypeInfo entry", () => {
    // 25 source types, 25 entries in the registry
    assert.ok(SOURCE_TYPE_INFO_LIST.length >= 25);
  });

  check("getSourceTypeInfo returns a sane default for unknown type", () => {
    const info = getSourceTypeInfo(undefined);
    assert.equal(info.sourceType, "plain_text");
  });

  check("social source types map to social_media category", () => {
    const socialTypes = [
      "social_x_post",
      "social_facebook_post",
      "social_facebook_video_post",
      "social_instagram_post",
      "social_instagram_reel",
      "social_reddit_post",
    ] as const;
    for (const s of socialTypes) {
      const info = getSourceTypeInfo(s);
      assert.equal(info.category, "social_media", `category for ${s}`);
      assert.equal(info.askEnabled, false, `askEnabled for ${s}`);
    }
  });

  check("code source types map to code category with source mode default", () => {
    const info = getSourceTypeInfo("code_python");
    assert.equal(info.category, "code");
    assert.equal(info.defaultDisplayMode, "source");
    assert.equal(info.supportsPreview, false);
  });

  check("html_input and markdown_input support preview", () => {
    assert.equal(getSourceTypeInfo("html_input").supportsPreview, true);
    assert.equal(getSourceTypeInfo("markdown_input").supportsPreview, true);
  });

  check("getCategoryLabel", () => {
    assert.equal(getCategoryLabel("social_media"), "Social Media");
    assert.equal(getCategoryLabel("repository"), "Repositories");
    assert.equal(getCategoryLabel(undefined), "Notes");
  });
});

group("content type routing", () => {
  check("source types route into broader upload-style buckets", () => {
    assert.equal(contentTypeForSourceType("social_x_post"), "social");
    assert.equal(contentTypeForSourceType("github_repository"), "repository");
    assert.equal(contentTypeForSourceType("code_python"), "code");
    assert.equal(contentTypeForSourceType("youtube_video"), "video");
    assert.equal(contentTypeForSourceType("voice_memo"), "podcast");
  });

  check("URL hints route common user uploads into useful buckets", () => {
    assert.equal(contentTypeForUrlHint("https://arxiv.org/abs/1706.03762"), "paper");
    assert.equal(contentTypeForUrlHint("https://example.com/report.pdf"), "document");
    assert.equal(contentTypeForUrlHint("https://example.com/model.py"), "code");
    assert.equal(contentTypeForUrlHint("https://example.com/metrics.csv"), "dataset");
    assert.equal(contentTypeForUrlHint("https://docs.google.com/presentation/d/abc"), "presentation");
  });
});

// ── Code / markup detection helpers ──────────────────────────────────────

group("code-content helpers", () => {
  check("detectCodeLanguage — python", () => {
    assert.equal(detectCodeLanguage("def f():\n    return 1"), "python");
  });

  check("detectCodeLanguage — javascript", () => {
    assert.equal(
      detectCodeLanguage("const x = 1;\nfunction foo() { return x; }"),
      "javascript",
    );
  });

  check("detectCodeLanguage — typescript wins over javascript", () => {
    assert.equal(
      detectCodeLanguage("interface X { a: string; } const y: X = {a:''};"),
      "typescript",
    );
  });

  check("detectCodeLanguage — returns null for plain prose", () => {
    assert.equal(detectCodeLanguage("Hello, world. This is a sentence."), null);
  });

  check("looksLikeMarkdown — heading + list", () => {
    assert.equal(looksLikeMarkdown("# Hi\n\n- a\n- b"), true);
  });

  check("looksLikeMarkdown — plain prose is not markdown", () => {
    assert.equal(looksLikeMarkdown("Just a sentence."), false);
  });

  check("looksLikeSourceCode — multiple code signals", () => {
    assert.equal(
      looksLikeSourceCode(
        "function a() { return 1; }\nconst b = a();\nconst c = b + 1;",
      ),
      true,
    );
  });

  check("supportsPreview — html + markdown yes, python no", () => {
    assert.equal(supportsPreview("html"), true);
    assert.equal(supportsPreview("markdown"), true);
    assert.equal(supportsPreview("python"), false);
  });

  check("encodeCodeContent / parseKnowledgeRawContent round-trip", () => {
    const encoded = encodeCodeContent({
      source: "<h1>hi</h1>",
      language: "html",
      preferredView: "preview",
    });
    const parsed = parseKnowledgeRawContent(encoded);
    assert.equal(parsed.kind, "encoded-code");
    if (parsed.kind === "encoded-code") {
      assert.equal(parsed.source, "<h1>hi</h1>");
      assert.equal(parsed.language, "html");
      assert.equal(parsed.preferredView, "preview");
      assert.equal(parsed.supportsPreview, true);
    }
  });

  check("encodeCodeContent — markdown round-trip", () => {
    const encoded = encodeCodeContent({
      source: "# Title\n\nbody",
      language: "markdown",
      preferredView: "preview",
    });
    const parsed = parseKnowledgeRawContent(encoded);
    assert.equal(parsed.kind, "encoded-code");
    if (parsed.kind === "encoded-code") {
      assert.equal(parsed.language, "markdown");
      assert.equal(parsed.supportsPreview, true);
    }
  });

  check("parseKnowledgeRawContent — plain text stays plain", () => {
    const parsed = parseKnowledgeRawContent("just a sentence");
    assert.equal(parsed.kind, "plain");
  });

  check("parseKnowledgeRawContent — raw HTML becomes encoded-code html", () => {
    const parsed = parseKnowledgeRawContent(
      "<!doctype html><html><body><div>x</div></body></html>",
    );
    assert.equal(parsed.kind, "encoded-code");
  });
});

// ── Summary ──────────────────────────────────────────────────────────────

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
