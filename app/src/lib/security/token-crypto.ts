/**
 * AES-256-GCM token encryption.
 *
 * Used for at-rest encryption of OAuth access/refresh tokens in the
 * `social_connections` table (migration 20270602000000). The 32-byte master
 * key lives in `TOKEN_ENCRYPTION_KEY` (base64) and is server-only.
 *
 * Why GCM:
 *   - Authenticated encryption — any tampering with ciphertext fails
 *     `decipher.final()` rather than producing garbage plaintext.
 *   - Random 12-byte IV per encryption — required for GCM uniqueness.
 *   - 16-byte auth tag stored alongside ciphertext.
 *
 * Storage layout: { ct, iv, tag } each base64. Stored as three separate
 * columns so the master key can be rotated by re-encrypting per row.
 *
 * **Important:** never log the plaintext. Never serialize a `Decrypted*`
 * value to a client response. The return type of `decrypt()` should ONLY
 * flow into provider extractors and HTTP fetches to upstream APIs.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32; // AES-256 key length
const IV_BYTES = 12; // GCM standard IV length
const TAG_BYTES = 16; // GCM auth tag length

export type EncryptedBlob = {
  /** base64-encoded ciphertext */
  ct: string;
  /** base64-encoded IV */
  iv: string;
  /** base64-encoded auth tag */
  tag: string;
};

let cachedKey: Buffer | null = null;

/**
 * Resolve the master encryption key from env, with helpful errors when it's
 * missing or malformed. Cached after first call.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY env var is missing. Generate with: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, "base64");
  } catch {
    throw new Error("TOKEN_ENCRYPTION_KEY must be base64-encoded.");
  }
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes; got ${buf.length}.`,
    );
  }
  cachedKey = buf;
  return buf;
}

/** Encrypt a plaintext string. Returns three base64 blobs to store separately. */
export function encrypt(plaintext: string): EncryptedBlob {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  if (tag.length !== TAG_BYTES) {
    // Defensive — should never happen with GCM at standard tag length.
    throw new Error("Unexpected GCM auth tag length.");
  }
  return {
    ct: ct.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypt a ciphertext blob. Throws if the auth tag fails verification —
 * i.e. if the ciphertext or IV has been tampered with, or if the wrong key
 * is used.
 */
export function decrypt(blob: EncryptedBlob): string {
  const key = getKey();
  const iv = Buffer.from(blob.iv, "base64");
  const ct = Buffer.from(blob.ct, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  if (iv.length !== IV_BYTES) {
    throw new Error(`Invalid IV length: expected ${IV_BYTES} bytes.`);
  }
  if (tag.length !== TAG_BYTES) {
    throw new Error(`Invalid auth tag length: expected ${TAG_BYTES} bytes.`);
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/**
 * Constant-time comparison of two strings. Used for OAuth state cookies and
 * any other secret-equality check where timing leaks must be prevented.
 */
export function safeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Generate a cryptographically random URL-safe token (used for OAuth state). */
export function randomUrlSafeToken(byteLen = 32): string {
  return randomBytes(byteLen).toString("base64url");
}
