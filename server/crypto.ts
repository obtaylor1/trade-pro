import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const DEFAULT_KEY = "tradepro_super_secret_encryption_key_32bytes!!"; // 32-byte fallback key

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
  // Derive a 32-byte key using SHA-256 to ensure exact length compliance
  return crypto.createHash("sha256").update(envKey).digest();
}

/**
 * Encrypts a plain text string.
 * Returns IV and Ciphertext joined by a colon.
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
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
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted format");
    }
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    throw new Error("Failed to decrypt credentials");
  }
}
