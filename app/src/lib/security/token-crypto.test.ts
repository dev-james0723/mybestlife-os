import { beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";

describe("token-crypto", () => {
  beforeAll(() => {
    // 32-byte key in base64 — set BEFORE the module is imported anywhere.
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  });

  it("roundtrips a plaintext through encrypt → decrypt", async () => {
    const { encrypt, decrypt } = await import("./token-crypto");
    const plaintext = "the-quick-brown-fox-jumps-over-the-lazy-dog-1234567890";
    const blob = encrypt(plaintext);
    expect(blob.ct).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(blob.iv).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(blob.tag).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(decrypt(blob)).toBe(plaintext);
  });

  it("produces a different ciphertext per call (random IV)", async () => {
    const { encrypt } = await import("./token-crypto");
    const a = encrypt("same-plaintext");
    const b = encrypt("same-plaintext");
    expect(a.ct).not.toBe(b.ct);
    expect(a.iv).not.toBe(b.iv);
  });

  it("rejects tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("./token-crypto");
    const blob = encrypt("hello");
    const tampered = {
      ...blob,
      ct: Buffer.from("nope this is wrong", "utf8").toString("base64"),
    };
    expect(() => decrypt(tampered)).toThrow();
  });

  it("rejects tampered auth tag", async () => {
    const { encrypt, decrypt } = await import("./token-crypto");
    const blob = encrypt("hello");
    const tampered = {
      ...blob,
      tag: Buffer.from(crypto.randomBytes(16)).toString("base64"),
    };
    expect(() => decrypt(tampered)).toThrow();
  });

  it("safeStringEqual is constant-time-ish and correct", async () => {
    const { safeStringEqual } = await import("./token-crypto");
    expect(safeStringEqual("abc", "abc")).toBe(true);
    expect(safeStringEqual("abc", "abd")).toBe(false);
    expect(safeStringEqual("abc", "abcd")).toBe(false);
    expect(safeStringEqual("", "")).toBe(true);
  });

  it("randomUrlSafeToken returns base64url chars only", async () => {
    const { randomUrlSafeToken } = await import("./token-crypto");
    const tok = randomUrlSafeToken(32);
    expect(tok).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(tok.length).toBeGreaterThan(40);
  });
});
