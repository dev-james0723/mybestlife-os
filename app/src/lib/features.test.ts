import { describe, expect, it } from "vitest";
import {
  resolveFinanceEnabled,
  resolveHealthEnabled,
  resolveLearningEnabled,
  resolveLifeCompanionEnabled,
  resolveNotesEnabled,
  resolveWeeklyReviewEnabled,
} from "@/lib/features";

describe("resolveLifeCompanionEnabled", () => {
  it("keeps Life Companion hidden by default in production", () => {
    expect(resolveLifeCompanionEnabled({ nodeEnv: "production" })).toBe(false);
  });

  it("keeps Life Companion available by default during local development", () => {
    expect(resolveLifeCompanionEnabled({ nodeEnv: "development" })).toBe(true);
  });

  it("allows an explicit production opt-in", () => {
    expect(
      resolveLifeCompanionEnabled({ nodeEnv: "production", override: "true" }),
    ).toBe(true);
  });

  it("allows an explicit local opt-out", () => {
    expect(
      resolveLifeCompanionEnabled({ nodeEnv: "development", override: "false" }),
    ).toBe(false);
  });

  it("fails closed when the environment is unknown", () => {
    expect(resolveLifeCompanionEnabled({})).toBe(false);
  });
});

describe("resolveLearningEnabled", () => {
  it("keeps Learning hidden by default in production", () => {
    expect(resolveLearningEnabled({ nodeEnv: "production" })).toBe(false);
  });

  it("keeps Learning available by default during local development", () => {
    expect(resolveLearningEnabled({ nodeEnv: "development" })).toBe(true);
  });

  it("allows Learning to be explicitly re-enabled later", () => {
    expect(
      resolveLearningEnabled({ nodeEnv: "production", override: "true" }),
    ).toBe(true);
  });
});

describe("resolveNotesEnabled", () => {
  it("keeps Notes hidden by default in production", () => {
    expect(resolveNotesEnabled({ nodeEnv: "production" })).toBe(false);
  });

  it("keeps Notes available by default during local development", () => {
    expect(resolveNotesEnabled({ nodeEnv: "development" })).toBe(true);
  });

  it("allows Notes to be explicitly re-enabled later", () => {
    expect(
      resolveNotesEnabled({ nodeEnv: "production", override: "true" }),
    ).toBe(true);
  });
});

describe("resolveFinanceEnabled", () => {
  it("keeps Finance hidden by default in production", () => {
    expect(resolveFinanceEnabled({ nodeEnv: "production" })).toBe(false);
  });

  it("keeps Finance available by default during local development", () => {
    expect(resolveFinanceEnabled({ nodeEnv: "development" })).toBe(true);
  });

  it("allows Finance to be explicitly re-enabled later", () => {
    expect(
      resolveFinanceEnabled({ nodeEnv: "production", override: "true" }),
    ).toBe(true);
  });
});

describe("resolveHealthEnabled", () => {
  it("keeps Health hidden by default in production", () => {
    expect(resolveHealthEnabled({ nodeEnv: "production" })).toBe(false);
  });

  it("keeps Health available by default during local development", () => {
    expect(resolveHealthEnabled({ nodeEnv: "development" })).toBe(true);
  });

  it("allows Health to be explicitly re-enabled later", () => {
    expect(
      resolveHealthEnabled({ nodeEnv: "production", override: "true" }),
    ).toBe(true);
  });
});

describe("resolveWeeklyReviewEnabled", () => {
  it("keeps Weekly Review hidden by default in production", () => {
    expect(resolveWeeklyReviewEnabled({ nodeEnv: "production" })).toBe(false);
  });

  it("keeps Weekly Review available by default during local development", () => {
    expect(resolveWeeklyReviewEnabled({ nodeEnv: "development" })).toBe(true);
  });

  it("allows Weekly Review to be explicitly re-enabled later", () => {
    expect(
      resolveWeeklyReviewEnabled({ nodeEnv: "production", override: "true" }),
    ).toBe(true);
  });
});
