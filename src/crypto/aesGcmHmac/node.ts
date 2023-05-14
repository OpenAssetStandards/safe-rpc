import { ICryptoImplementationV1, IEncryptionKeyV1, ISignatureKeyV1 } from "../../types";
import {randomBytes, createCipheriv, createDecipheriv, createHmac} from 'crypto';
import { NonRandomIVGenerator } from "../../utils/nonRandomIVGenerator";
const IV_LENGTH = 12;
const cryptoRandomBytes = randomBytes;
/*
function printU8Hex(name: string, u8: Uint8Array){
  //console.log(name+": "+Buffer.from(u8).toString("hex"));

}
*/
class NodeHmacSignatureKey implements ISignatureKeyV1 {
  key: Uint8Array;
  constructor(key: Uint8Array) {
    this.key = key;
  }
  async sign(data: Uint8Array): Promise<Uint8Array> {

  	return createHmac("sha256", this.key).update(data).digest();
  }
  async verify(signature: Uint8Array, data: Uint8Array): Promise<boolean> {
    const digest = createHmac("sha256", this.key).update(new Uint8Array(data)).digest();
    if(digest.length !== signature.length){
      return false;
    }
    for(let i=0,l=digest.length;i<l;i++){
      if(digest[i] !== signature[i]){
        return false;
      }
    }
    return true;
  }
  async exportKey(): Promise<Uint8Array> {
    return this.key;
  }
  static async importKey(keyBuffer: Uint8Array): Promise<NodeHmacSignatureKey> {

    return new NodeHmacSignatureKey(new Uint8Array(keyBuffer));
  }
  static async generateRandomKey(): Promise<NodeHmacSignatureKey> {
    return new NodeHmacSignatureKey(randomBytes(32));
  }
}
class NodeAesGcmEncryptionKey implements IEncryptionKeyV1 {
  key: Uint8Array;
  ivGenerator: NonRandomIVGenerator;
  constructor(key: Uint8Array) {
    this.key = key;
    this.ivGenerator = new NonRandomIVGenerator(randomBytes(7));

  }
  async encrypt(data: Uint8Array): Promise<Uint8Array> {
    const iv = this.ivGenerator.nextIv();
    //printU8Hex("encIv", iv);
    //printU8Hex("encKey", this.key);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);

    const encData0 = cipher.update(data);
    //printU8Hex("encData0", encData0);
    const encData1 = cipher.final();
    //printU8Hex("encData1", encData1);
    const authTag = cipher.getAuthTag();
    //printU8Hex("encrypt-authTag", authTag);

    const encryptedPayload = Buffer.concat([iv, encData0, encData1, authTag]);
    return encryptedPayload;
  }
  async decrypt(data: Uint8Array): Promise<Uint8Array> {
    if(data.length<=(IV_LENGTH+16)){
      throw new Error("encrypted data missing iv");
    }
    const authTagLocation =data.length-16;
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(authTagLocation);

    //printU8Hex("decIv", iv);
    //printU8Hex("decKey", this.key);
    //printU8Hex("decrypt-authTag", authTag);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    const decData0 = decipher.update(data.subarray(IV_LENGTH, authTagLocation));
    //printU8Hex("decData0", decData0);
    const decData1 = decipher.final();
    //printU8Hex("decData1", decData1);
    const decryptedPayload = Buffer.concat([decData0, decData1]);
    return decryptedPayload;
  }
  async exportKey(): Promise<Uint8Array> {
    return this.key;
  }
  static async importKey(keyBuffer: Uint8Array): Promise<NodeAesGcmEncryptionKey> {

    return new NodeAesGcmEncryptionKey(new Uint8Array(keyBuffer));
  }
  static async generateRandomKey(): Promise<NodeAesGcmEncryptionKey> {
    return new NodeAesGcmEncryptionKey(new Uint8Array(randomBytes(32)));
  }
}
class NodeAesGcmHmacCryptoImplementation implements ICryptoImplementationV1 {
  randomBytes(count: number): Uint8Array {
    return cryptoRandomBytes(count);
  }
  importEncryptionKey(key: Uint8Array): Promise<IEncryptionKeyV1> {
    return NodeAesGcmEncryptionKey.importKey(key);
  }
  importSignatureKey(key: Uint8Array): Promise<ISignatureKeyV1> {
    return NodeHmacSignatureKey.importKey(key);
  }
  generateRandomEncryptionKey(): Promise<IEncryptionKeyV1> {
    return NodeAesGcmEncryptionKey.generateRandomKey();
  }
  generateRandomSignatureKey(): Promise<ISignatureKeyV1> {
    return NodeHmacSignatureKey.generateRandomKey();
  }
}

export {
  NodeAesGcmEncryptionKey,
  NodeHmacSignatureKey,
  NodeAesGcmHmacCryptoImplementation,
}
