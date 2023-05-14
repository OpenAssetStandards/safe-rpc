import { ICryptoImplementationV1, IEncryptionKeyV1, ISignatureKeyV1 } from "../../types";
import { NonRandomIVGenerator } from "../../utils/nonRandomIVGenerator";
const IV_LENGTH = 12;
class BrowserHmacSignatureKey implements ISignatureKeyV1 {
  key: CryptoKey;
  constructor(key: CryptoKey) {
    this.key = key;
  }
  async sign(data: Uint8Array): Promise<Uint8Array> {
    const signature = await window.crypto.subtle.sign(
      {
        name: "HMAC",
      },
      this.key, //from generateKey or importKey above
      data //ArrayBuffer of data you want to sign
    );
    return new Uint8Array(signature);
  }
  async verify(signature: Uint8Array, data: Uint8Array): Promise<boolean> {
    const isSignatureValid = await window.crypto.subtle.verify(
      {
        name: "HMAC",
      },
      this.key, //from generateKey or importKey above
      signature, //ArrayBuffer of the signature
      data //ArrayBuffer of the data
    );
    return isSignatureValid;
  }
  async exportKey(): Promise<Uint8Array> {
    const hmacKeyBuf = await window.crypto.subtle.exportKey("raw", this.key);
    return new Uint8Array(hmacKeyBuf);
  }
  static async importKey(keyBuffer: Uint8Array): Promise<BrowserHmacSignatureKey> {
    const hmacKey = await window.crypto.subtle.importKey(
      "raw", //can be "jwk" or "raw"
      keyBuffer,
      {
        //this is the algorithm options
        name: "HMAC",
        hash: { name: "SHA-256" }, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
        //length: 256, //optional, if you want your key length to differ from the hash function's block length
      },
      false, //whether the key is extractable (i.e. can be used in exportKey)
      ["sign", "verify"] //can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    );
    return new BrowserHmacSignatureKey(hmacKey);
  }
  static async generateRandomKey(): Promise<BrowserHmacSignatureKey> {
    const hmacKey = await window.crypto.subtle.generateKey(
      {
        name: "HMAC",
        hash: { name: "SHA-256" }, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
        //length: 256, //optional, if you want your key length to differ from the hash function's block length
      },
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ["sign", "verify"] //can be any combination of "sign" and "verify"
    );
    return new BrowserHmacSignatureKey(hmacKey);
  }
}
class BrowserAesGcmEncryptionKey implements IEncryptionKeyV1 {
  key: CryptoKey;
  ivGenerator: NonRandomIVGenerator;
  constructor(key: CryptoKey) {
    this.key = key;
    this.ivGenerator = new NonRandomIVGenerator(window.crypto.getRandomValues(new Uint8Array(7)))

  }
  async encrypt(data: Uint8Array): Promise<Uint8Array> {
    const iv = this.ivGenerator.nextIv();

    const encryptedPayload = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",

        //Don't re-use initialization vectors!
        //Always generate a new iv every time your encrypt!
        //Recommended to use 12 bytes length
        iv: iv,

        //Additional authentication data (optional)
        //Tag length (optional)
        tagLength: 128, //can be 32, 64, 96, 104, 112, 120 or 128 (default)
      },
      this.key, //from generateKey or importKey above
      data //ArrayBuffer of data you want to encrypt
    );
    const encPayloadU8 = new Uint8Array(encryptedPayload);
    const combined = new Uint8Array(IV_LENGTH+encPayloadU8.length);
    combined.set(iv);
    combined.set(encPayloadU8, IV_LENGTH);
    return combined;
  }
  async decrypt(data: Uint8Array): Promise<Uint8Array> {
    if(data.length<=IV_LENGTH){
      throw new Error("encrypted data missing iv");
    }
    const decryptedPayload = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: data.subarray(0, IV_LENGTH),
        tagLength: 128, //The tagLength you used to encrypt (if any)
      },
      this.key, //from generateKey or importKey above
      data.subarray(IV_LENGTH) //ArrayBuffer of the data
    );
    return new Uint8Array(decryptedPayload);
  }
  async exportKey(): Promise<Uint8Array> {
    const encryptionKeyBuf = await window.crypto.subtle.exportKey("raw", this.key);
    return new Uint8Array(encryptionKeyBuf);
  }
  static async importKey(keyBuffer: Uint8Array): Promise<BrowserAesGcmEncryptionKey> {
    const encryptionKey = await window.crypto.subtle.importKey(
      "raw", //can be "jwk" or "raw"
      keyBuffer,
      {
        //this is the algorithm options
        name: "AES-GCM",
      },
      false, //whether the key is extractable (i.e. can be used in exportKey)
      ["encrypt", "decrypt"] //can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    );
    return new BrowserAesGcmEncryptionKey(encryptionKey);
  }
  static async generateRandomKey(): Promise<BrowserAesGcmEncryptionKey> {
    const encryptionKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256, //can be  128, 192, or 256
      },
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ["encrypt", "decrypt"] //can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    );
    return new BrowserAesGcmEncryptionKey(encryptionKey);
  }
}
class BrowserAesGcmHmacCryptoImplementation implements ICryptoImplementationV1 {
  randomBytes(count: number): Uint8Array {
    const randomBuf = new Uint8Array(count);
    return window.crypto.getRandomValues<Uint8Array>(randomBuf);
  }
  importEncryptionKey(key: Uint8Array): Promise<IEncryptionKeyV1> {
    return BrowserAesGcmEncryptionKey.importKey(key);
  }
  importSignatureKey(key: Uint8Array): Promise<ISignatureKeyV1> {
    return BrowserHmacSignatureKey.importKey(key);
  }
  generateRandomEncryptionKey(): Promise<IEncryptionKeyV1> {
    return BrowserAesGcmEncryptionKey.generateRandomKey();
  }
  generateRandomSignatureKey(): Promise<ISignatureKeyV1> {
    return BrowserHmacSignatureKey.generateRandomKey();
  }
}

export {
  BrowserHmacSignatureKey,
  BrowserAesGcmEncryptionKey,
  BrowserAesGcmHmacCryptoImplementation,
}
