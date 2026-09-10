import { describe, expect, it } from "vitest";

import nextConfig from "../../../next.config";

describe("global geolocation permissions policy", () => {
  it("allows same-origin geolocation instead of disabling it", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");

    const rules = await nextConfig.headers!();
    const globalRule = rules.find((rule) => rule.source === "/:path*");
    const policy = globalRule?.headers.find(
      (header) => header.key.toLowerCase() === "permissions-policy",
    )?.value;

    expect(policy).toBeDefined();
    expect(policy).toMatch(/(?:^|,\s*)geolocation=\(self\)(?:,|$)/);
    expect(policy).not.toContain("geolocation=()");
  });
});
