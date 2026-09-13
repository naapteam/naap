// Owner-only encrypted rate — architecture §8. The server never sees a
// plaintext rate: the key is derived from the owner's passphrase via
// PBKDF2 and only ever exists in browser memory for the current tab; only
// the salt and ciphertext (never the passphrase or key) are stored
// server-side, in mill.settings and secure_note respectively.
const PBKDF2_ITERATIONS = 200_000;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array<ArrayBuffer> {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generateSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveRateKey(
  passphrase: string,
  saltB64: string,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptWithRateKey(
  key: CryptoKey,
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { ciphertext: toBase64(new Uint8Array(buf)), iv: toBase64(iv) };
}

export async function decryptWithRateKey(
  key: CryptoKey,
  ciphertext: string,
  iv: string,
): Promise<string> {
  const buf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    key,
    fromBase64(ciphertext),
  );
  return new TextDecoder().decode(buf);
}

/** A fixed marker string, encrypted at setup time and stored alongside the
 * salt. Unlock re-derives the key and tries to decrypt this — AES-GCM's
 * authentication tag makes a wrong passphrase fail here rather than
 * silently returning garbage, so this is how a wrong passphrase is
 * detected without ever storing the passphrase itself. */
export const RATE_LOCK_VERIFIER = "naap-rate-lock-v1";

export async function verifyRateKey(
  key: CryptoKey,
  verifierCiphertext: string,
  verifierIv: string,
): Promise<boolean> {
  try {
    const decrypted = await decryptWithRateKey(key, verifierCiphertext, verifierIv);
    return decrypted === RATE_LOCK_VERIFIER;
  } catch {
    return false;
  }
}
