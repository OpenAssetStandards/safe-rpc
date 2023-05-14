import { BrowserAesGcmHmacCryptoImplementation } from "./crypto/aesGcmHmac/browser";
import { EncryptedSession } from "./encryptedSession";

EncryptedSession.defaultCryptoImplementation = new BrowserAesGcmHmacCryptoImplementation();
export * from "./base";
