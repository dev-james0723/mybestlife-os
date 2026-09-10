import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./auth-return-path";
describe("authentication return paths", () => {
  it("preserves a localized destination with query and anchor", () => {
    expect(safeReturnPath("/zh-hk/knowledge-base?item=abc#sources", "/en/dashboard")).toBe("/zh-hk/knowledge-base?item=abc#sources");
  });
  it.each(["https://example.com", "//example.com", "/\\example.com", "/%2fexample.com", "/%5cexample.com", "/%00x", "/en/login?next=/en/login", "/callback", "/%zz"])("rejects unsafe or looping destination %s", (value) => {
    expect(safeReturnPath(value, "/en/dashboard")).toBe("/en/dashboard");
  });
});
