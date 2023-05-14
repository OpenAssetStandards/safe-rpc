import { IPeerSessionConfig } from "../types";

function serializePeerSessionConfig(config: IPeerSessionConfig): string {
  return [
    config.encryptionKeyHex,
    config.authenticationKeyHex,
    config.identityHex,
    config.peerIdentityHex,
  ].join("-");
}
function deserializePeerSessionConfig(
  serializedConfig: string
): IPeerSessionConfig {
  const parts = serializedConfig.split("-");
  if (parts.length !== 4) {
    throw new Error("error parsing serialized peer session config");
  }
  return {
    encryptionKeyHex: parts[0],
    authenticationKeyHex: parts[1],
    identityHex: parts[2],
    peerIdentityHex: parts[3],
  };
}

function isEncryptedMessage(message: any): boolean {
  return (
    typeof message === "object" &&
    message &&
    message.fromIdentity instanceof Uint8Array &&
    message.fromIdentity.length > 0 &&
    message.toIdentity instanceof Uint8Array &&
    message.toIdentity.length > 0 &&
    message.signature &&
    message.signature instanceof Uint8Array &&
    message.payload &&
    message.payload instanceof Uint8Array
  );
}

export {
  serializePeerSessionConfig,
  deserializePeerSessionConfig,
  isEncryptedMessage,
};
