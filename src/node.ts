import { NodeAesGcmHmacCryptoImplementation } from "./crypto/aesGcmHmac/node";
import { EncryptedSession } from "./encryptedSession";

EncryptedSession.defaultCryptoImplementation = new NodeAesGcmHmacCryptoImplementation();
export * from "./base";
