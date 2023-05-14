import { ICryptoImplementationV1, IEncryptedMessage, IEncryptionKeyV1, IPeerSessionConfig, ISignatureKeyV1 } from "./types";
import { compareUint8Arrays, hexToUint8Array, uint8ArrayToHex } from "./utils/u8Array";

class EncryptedSession {
  initialized = false;
  counter = 0;

  authenticationKey: ISignatureKeyV1;
  encryptionKey: IEncryptionKeyV1;
  cryptoImplementation: ICryptoImplementationV1;
  identity: Uint8Array;
  identityHex: string;
  peerIdentity: Uint8Array;
  peerIdentityHex: string;

  constructor(
    authenticationKey: ISignatureKeyV1,
    encryptionKey: IEncryptionKeyV1,
    cryptoImplementation: ICryptoImplementationV1,
    identity: Uint8Array,
    peerIdentity: Uint8Array
  ) {
    this.authenticationKey = authenticationKey;
    this.encryptionKey = encryptionKey;
    this.cryptoImplementation = cryptoImplementation;
    this.identity = identity;
    this.identityHex = uint8ArrayToHex(identity);
    this.peerIdentity = peerIdentity;
    this.peerIdentityHex = uint8ArrayToHex(peerIdentity);
  }
  static defaultCryptoImplementation: ICryptoImplementationV1 = {} as any;

  static async newRandomSession(inputCryptoImplementation?: ICryptoImplementationV1): Promise<EncryptedSession> {
    const cryptoImplementation = inputCryptoImplementation?inputCryptoImplementation:EncryptedSession.defaultCryptoImplementation;
    const authenticationKey = await cryptoImplementation.generateRandomSignatureKey();


    const encryptionKey = await cryptoImplementation.generateRandomEncryptionKey();


    const identity = cryptoImplementation.randomBytes(12);
    const peerIdentity = cryptoImplementation.randomBytes(12);


    return new EncryptedSession(
      authenticationKey,
      encryptionKey,
      cryptoImplementation,
      identity,
      peerIdentity
    );
  }
  async generatePeerSessionConfig(): Promise<IPeerSessionConfig> {
    const authenticationKeyBuf = await this.authenticationKey.exportKey();
    const encryptionKeyBuf = await this.encryptionKey.exportKey();
    return {
      peerIdentityHex: uint8ArrayToHex(this.identity),
      identityHex: uint8ArrayToHex(this.peerIdentity),
      encryptionKeyHex: uint8ArrayToHex((encryptionKeyBuf)),
      authenticationKeyHex: uint8ArrayToHex((authenticationKeyBuf)),
    };
  }

  static async fromPeerSessionInfo(
    config: IPeerSessionConfig,
    inputCryptoImplementation?: ICryptoImplementationV1
  ): Promise<EncryptedSession> {
    const cryptoImplementation = inputCryptoImplementation?inputCryptoImplementation:EncryptedSession.defaultCryptoImplementation;

    const identity = hexToUint8Array(config.identityHex);
    const peerIdentity = hexToUint8Array(config.peerIdentityHex);
    const authenticationKey = await cryptoImplementation.importSignatureKey(hexToUint8Array(config.authenticationKeyHex));

    const encryptionKey = await cryptoImplementation.importEncryptionKey(hexToUint8Array(config.encryptionKeyHex));

    return new EncryptedSession(
      authenticationKey,
      encryptionKey,
      cryptoImplementation,
      identity,
      peerIdentity
    );
  }
  isMessageFromPeerIdentity(encryptedMessage: IEncryptedMessage) {
    return (
      compareUint8Arrays(encryptedMessage.toIdentity, this.identity) &&
      compareUint8Arrays(encryptedMessage.fromIdentity, this.peerIdentity)
    );
  }
  async encryptMessageForPeer(
    message: Uint8Array
  ): Promise<IEncryptedMessage> {
    const encryptedPayload = await this.encryptionKey.encrypt(message);
    const signature = await this.authenticationKey.sign(encryptedPayload);

    return {
      fromIdentity: this.identity,
      toIdentity: this.peerIdentity,
      signature,
      payload: encryptedPayload,
    };
  }
  async decryptMessageFromPeer(
    encryptedMessage: IEncryptedMessage
  ): Promise<Uint8Array> {
    const isSignatureValid = await this.authenticationKey.verify(encryptedMessage.signature, encryptedMessage.payload);
    if (!isSignatureValid) {
      throw new Error("error decrypting message from peer: invalid signature");
    }
    const decryptedPayload = await this.encryptionKey.decrypt(encryptedMessage.payload);
    return decryptedPayload;
  }
}

export { EncryptedSession };
