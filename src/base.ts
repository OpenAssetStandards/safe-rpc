import { EncryptedRPCSession } from './encryptedRPC';
import { EncryptedSession } from './encryptedSession';
import { EncryptedSessionMessageHub } from './encryptedSessionHub';
import { deserializePeerSessionConfig, isEncryptedMessage, serializePeerSessionConfig } from './utils/helpers';
import { createRPCHandlerClass, createRPCProxiedPeer } from './utils/rpcProxyHelper';
import { hexToUint8Array, uint8ArrayToHex } from './utils/u8Array';

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
} from './types'

export {
  EncryptedSession,
  EncryptedSessionMessageHub,
  EncryptedRPCSession,

  uint8ArrayToHex,
  hexToUint8Array,
  serializePeerSessionConfig,
  deserializePeerSessionConfig,
  isEncryptedMessage,

  createRPCProxiedPeer,
  createRPCHandlerClass,
};
