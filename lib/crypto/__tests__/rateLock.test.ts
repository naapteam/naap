import { describe, expect, it } from "vitest";
import {
  RATE_LOCK_VERIFIER,
  decryptWithRateKey,
  deriveRateKey,
  encryptWithRateKey,
  generateSalt,
  verifyRateKey,
} from "../rateLock";

describe("rate lock — full round trip (architecture §8)", () => {
  it("encrypts and decrypts a rate with the correct passphrase", async () => {
    const salt = generateSalt();
    const key = await deriveRateKey("correct horse battery staple", salt);
    const { ciphertext, iv } = await encryptWithRateKey(key, "1250");
    const decrypted = await decryptWithRateKey(key, ciphertext, iv);
    expect(decrypted).toBe("1250");
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const salt = generateSalt();
    const key = await deriveRateKey("pw", salt);
    const a = await encryptWithRateKey(key, "1250");
    const b = await encryptWithRateKey(key, "1250");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it("fails to decrypt with the wrong passphrase (never silently returns garbage as success)", async () => {
    const salt = generateSalt();
    const rightKey = await deriveRateKey("right passphrase", salt);
    const wrongKey = await deriveRateKey("wrong passphrase", salt);
    const { ciphertext, iv } = await encryptWithRateKey(rightKey, "1250");
    await expect(decryptWithRateKey(wrongKey, ciphertext, iv)).rejects.toThrow();
  });

  it("derives a different key from the same passphrase with a different salt", async () => {
    const keyA = await deriveRateKey("same passphrase", generateSalt());
    const keyB = await deriveRateKey("same passphrase", generateSalt());
    const { ciphertext, iv } = await encryptWithRateKey(keyA, "1250");
    await expect(decryptWithRateKey(keyB, ciphertext, iv)).rejects.toThrow();
  });
});

describe("verifyRateKey — passphrase check without ever storing the passphrase", () => {
  it("confirms the right passphrase against a stored verifier", async () => {
    const salt = generateSalt();
    const key = await deriveRateKey("owner passphrase", salt);
    const { ciphertext, iv } = await encryptWithRateKey(key, RATE_LOCK_VERIFIER);

    const reenteredKey = await deriveRateKey("owner passphrase", salt);
    expect(await verifyRateKey(reenteredKey, ciphertext, iv)).toBe(true);
  });

  it("rejects a wrong passphrase against the same verifier", async () => {
    const salt = generateSalt();
    const key = await deriveRateKey("owner passphrase", salt);
    const { ciphertext, iv } = await encryptWithRateKey(key, RATE_LOCK_VERIFIER);

    const wrongKey = await deriveRateKey("a guess", salt);
    expect(await verifyRateKey(wrongKey, ciphertext, iv)).toBe(false);
  });
});
