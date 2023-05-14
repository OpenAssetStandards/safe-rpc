
interface IEncryptedMessage {
  fromIdentity: Uint8Array;
  toIdentity: Uint8Array;
  payload: Uint8Array;
  signature: Uint8Array;
}
interface IPeerSessionConfig {
  encryptionKeyHex: string;
  authenticationKeyHex: string;
  identityHex: string;
  peerIdentityHex: string;
}


interface ISyncRawMessageChannel {
  sendMessageRaw(message: IEncryptedMessage);
  addMessageListener(callback: (message: IEncryptedMessage)=> void);
  removeMessageListener(callback: (message: IEncryptedMessage)=> void);
  connect(config?: any);
  canSendMessage(): boolean;
  dispose();
}
interface IAsyncRawMessageChannel {
  sendMessageRaw(message: IEncryptedMessage): Promise<void>;
  addMessageListener(callback: (message: IEncryptedMessage)=> void);
  removeMessageListener(callback: (message: IEncryptedMessage)=> void);
  connect(config?: any): Promise<void>;
  canSendMessage(): boolean;
  dispose(): Promise<void>;
}
interface ISyncRawMessageChannelHandler {
  addListener(listener: (message: any)=>void);
  removeListener(listener: (message: any)=>void);
  sendMessageRaw(message: IEncryptedMessage);
}
interface IAsyncRawMessageChannelHandler {
  addListener(listener: (message: any)=>void): Promise<void>;
  removeListener(listener: (message: any)=>void): Promise<void>;
  sendMessageRaw(message: IEncryptedMessage): Promise<void>;
}

interface IDataSerializer {
  serialize: (data: any) => Uint8Array,
  deserialize: (serializedData: Uint8Array) => any,
}
interface IEncryptedRPCSessionConfig {
  serializer?: IDataSerializer,
  onMessageHandlerError?: (error: Error) => any | null,
  onDecryptionError?: (error: Error) => any
}

interface IEncryptionKeyV1 {
  encrypt(data: Uint8Array): Promise<Uint8Array>;
  decrypt(data: Uint8Array): Promise<Uint8Array>;
  exportKey(): Promise<Uint8Array>;
}
interface ISignatureKeyV1 {
  sign(data: Uint8Array): Promise<Uint8Array>;
  verify(signature: Uint8Array, data: Uint8Array): Promise<boolean>;
  exportKey(): Promise<Uint8Array>;
}
interface ICryptoImplementationV1 {
  randomBytes(count: number): Uint8Array;
  importEncryptionKey(key: Uint8Array): Promise<IEncryptionKeyV1>;
  importSignatureKey(key: Uint8Array): Promise<ISignatureKeyV1>;
  generateRandomEncryptionKey(): Promise<IEncryptionKeyV1>;
  generateRandomSignatureKey(): Promise<ISignatureKeyV1>;
}

type TRPCHandlerMap =
  | { [name: string]: (arg?: any) => any }
  | Map<string, (arg?: any) => any>;
type TRPCHandlerItem = { name: string; handler: (arg?: any) => any };

export type {
  IPeerSessionConfig,
  IEncryptedMessage,
  ISyncRawMessageChannel,
  ISyncRawMessageChannelHandler,
  IAsyncRawMessageChannel,
  IAsyncRawMessageChannelHandler,
  IDataSerializer,
  IEncryptedRPCSessionConfig,

  ICryptoImplementationV1,
  IEncryptionKeyV1,
  ISignatureKeyV1,

  TRPCHandlerMap,
  TRPCHandlerItem,
}
