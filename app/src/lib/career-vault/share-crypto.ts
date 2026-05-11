/**
 * Share-password hashing.
 *
 * We intentionally do NOT use bcrypt:
 *   - Share passwords are short-lived recipient gates, not account credentials;
 *     they guard URLs that the user can revoke at any time.
 *   - bcryptjs would add a heavy WASM-free implementation; we prefer the
 *     browser-native WebCrypto primitives that also work inside the Supabase
 *     edge runtime (which exposes the same WebCrypto surface).
 *
 * Scheme: PBKDF2-SHA256, 100 000 iterations, 16-byte random salt, 32-byte
 * derived key. Salt and derived key are base64url-encoded and stored in two
 * separate columns (`password_salt`, `password_hash`). Verification runs the
 * same derivation and constant-time compares the output.
 */

const ITERATIONS = 100_000;
const KEY_LEN_BYTES = 32;
const SALT_LEN_BYTES = 16;

function getSubtle(): SubtleCrypto {
  const subtle =
    (typeof globalThis !== "undefined" &&
      (globalThis.crypto as Crypto | undefined)?.subtle) ||
    undefined;
  if (!subtle) {
    throw new Error("WebCrypto SubtleCrypto is not available in this runtime");
  }
  return subtle;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const subtle = getSubtle();
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  // Copy the salt into a fresh ArrayBuffer so the deriveBits signature accepts
  // it even when the caller's Uint8Array is backed by a SharedArrayBuffer.
  const saltBuf = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuf).set(salt);
  const bits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    key,
    KEY_LEN_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashSharePassword(password: string): Promise<{
  salt: string;
  hash: string;
}> {
  const saltBytes = new Uint8Array(SALT_LEN_BYTES);
  crypto.getRandomValues(saltBytes);
  const derived = await derive(password, saltBytes);
  return {
    salt: bytesToBase64Url(saltBytes),
    hash: bytesToBase64Url(derived),
  };
}

/** Constant-time equality check for two base64url-encoded digests. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifySharePassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const saltBytes = base64UrlToBytes(salt);
  const expected = base64UrlToBytes(expectedHash);
  const derived = await derive(password, saltBytes);
  return constantTimeEqual(derived, expected);
}

/** Random URL-safe token, ~22 chars from 16 random bytes. */
export function generateShareToken(lengthBytes = 16): string {
  const bytes = new Uint8Array(lengthBytes);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}
