import { describe, expect, it } from "vitest";
import { isMissingColumnError } from "@/lib/grateful-things/db-errors";

describe("isMissingColumnError", () => {
  it("detects PostgREST schema cache errors", () => {
    expect(
      isMissingColumnError(
        { code: "PGRST204", message: "Could not find the 'thumbnail_url' column" },
        "thumbnail_url",
      ),
    ).toBe(true);
  });

  it("detects Postgres undefined column errors", () => {
    expect(
      isMissingColumnError(
        { code: "42703", message: 'column "thumbnail_url" does not exist' },
        "thumbnail_url",
      ),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(
      isMissingColumnError({ code: "42501", message: "new row violates row-level security policy" }, "thumbnail_url"),
    ).toBe(false);
  });
});
