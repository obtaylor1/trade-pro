import crypto from "crypto";
import { ENCRYPTION_KEY } from "./config";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  // Derive a 32-byte key using SHA-256 to ensure exact length compliance
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

/**
 * Encrypts a plain text string.
 * Returns a versioned IV, authentication tag, and ciphertext payload.
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();
    return `gcm:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
  } catch (err) {
    console.error("Encryption failed:", err);
    throw new Error("Failed to encrypt credentials");
  }
}

/**
 * Decrypts an encrypted credentials string.
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(":");
    // Backward compatibility for credentials encrypted before the GCM migration.
    if (parts.length === 2) {
      const legacyIv = Buffer.from(parts[0], "hex");
      const legacyDecipher = crypto.createDecipheriv("aes-256-cbc", key, legacyIv);
      let legacyPlaintext = legacyDecipher.update(parts[1], "hex", "utf8");
      legacyPlaintext += legacyDecipher.final("utf8");
      return legacyPlaintext;
    }
    if (parts.length !== 4 || parts[0] !== "gcm") throw new Error("Invalid encrypted format");
    const iv = Buffer.from(parts[1], "hex");
    const tag = Buffer.from(parts[2], "hex");
    const encrypted = parts[3];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    throw new Error("Failed to decrypt credentials");
  }
}
