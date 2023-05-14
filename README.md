# safe-rpc

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![Codecov][codecov-src]][codecov-href]
[![License][license-src]][license-href]
[![JSDocs][jsdocs-src]][jsdocs-href]

### An encrypted, authenticated, transport agnostic rpc protocol.
Create RPC services that communicate over atypical transport layers like the postMessage API(see [safe-rpc-iframe](https://github.com/OpenAssetStandards/safe-rpc-iframe)), usb flash drive, homing pigeon, snail mail, audio, QR codes and more.

## 🚀 Quick Start

Install:

```bash
# npm
npm i safe-rpc

# yarn
yarn add safe-rpc
```

Example Usage:
First define your channel and peer classes:
```typescript
import {
  EncryptedRPCSession,
  EncryptedSession,
  EncryptedSessionMessageHub,
  IEncryptedMessage,
  ISyncRawMessageChannel,
  deserializePeerSessionConfig,
  serializePeerSessionConfig,
} from "safe-rpc";
import {
  SimpleSyncTransport,
  ISimpleSyncTransportChannelHandler,
} from "safe-rpc/simpleTransport";

function parseConfigString(cfgString: string) {
  const splitParts = cfgString.split("~");
  if (splitParts.length !== 3) {
    throw new Error("invalid cfg string");
  }
  const [serializedPeerSessionConfig, id, peerId] = splitParts;

  return {
    serializedPeerSessionConfig,
    id,
    peerId,
  };
}

function encodeConfigString(
  serializedPeerSessionConfig: string,
  id: string,
  peerId: string
) {
  if(serializedPeerSessionConfig.indexOf("~") !== -1){
    throw new Error("serializedPeerSessionConfig must not contain the character '~'");
  }
  if(id.indexOf("~") !== -1){
    throw new Error("id must not contain the character '~'");
  }
  if(peerId.indexOf("~") !== -1){
    throw new Error("peerId must not contain the character '~'");
  }
  return [serializedPeerSessionConfig, id, peerId].join("~");
}

class SimpleSyncChannel
  implements ISyncRawMessageChannel, ISimpleSyncTransportChannelHandler
{
  id: string;
  peerId: string;
  transport: SimpleSyncTransport;
  disposed = false;
  callbacks: ((message: IEncryptedMessage) => void)[] = [];

  constructor(id: string, peerId: string, transport: SimpleSyncTransport) {
    this.id = id;
    this.peerId = peerId;
    this.transport = transport;
    transport.registerPeer(id, this);
  }
  sendMessageRaw(message: IEncryptedMessage) {
    this.transport.sendMessage(this.peerId, message);
  }
  addMessageListener(callback: (message: IEncryptedMessage) => void) {
    if (this.callbacks.indexOf(callback) !== -1) {
      return;
    }
    this.callbacks.push(callback);
  }

  notifyMessage(message: any): any {
    for (const cb of this.callbacks) {
      try {
        cb(message);
      } catch (err) {
        // comment the line below to ignore callback errors
        throw err;
      }
    }
  }
  removeMessageListener(callback: (message: IEncryptedMessage) => void) {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks = this.callbacks
        .slice(0, index)
        .concat(this.callbacks.slice(index + 1));
    }
  }
  connect(config?: any) {
    return true;
  }
  canSendMessage(): boolean {
    return !this.disposed;
  }
  dispose() {
    if (this.disposed) {
      return;
    }
    this.transport.unregisterPeer(this.id);
    this.disposed = true;
    this.callbacks = [];
  }
}

class SimplePeer extends EncryptedSessionMessageHub {
  //@ts-ignore
  channel: SimpleSyncChannel;
  id: string;
  peerId: string;
  constructor(
    session: EncryptedSession,
    channel: SimpleSyncChannel,
    id: string,
    peerId: string,
    onMessageHandlerError: (error: Error) => any | null = (error: Error) =>
      console.error(error),
    onDecryptionError?: (error: Error) => any
  ) {
    super(session, channel, onMessageHandlerError, onDecryptionError);
    this.channel = channel;
    this.id = id;
    this.peerId = peerId;
  }
  async getConfigStringForPeer(): Promise<string> {
    const peerSessionConfig = await this.session.generatePeerSessionConfig();
    return encodeConfigString(
      serializePeerSessionConfig(peerSessionConfig),
      this.peerId,
      this.id
    );
  }

  static async createWithPeerFromConfigString(
    transport: SimpleSyncTransport,
    configString: string,
    onMessageHandlerError: (error: Error) => any | null = (error: Error) =>
      console.error(error),
    onDecryptionError?: (error: Error) => any
  ): Promise<SimplePeer> {
    const { id, peerId, serializedPeerSessionConfig } =
      parseConfigString(configString);
    const deserializedPeerSessionInfo = deserializePeerSessionConfig(
      serializedPeerSessionConfig
    );
    const session = await EncryptedSession.fromPeerSessionInfo(
      deserializedPeerSessionInfo
    );
    const channel = new SimpleSyncChannel(id, peerId, transport);
    const hub = new SimplePeer(
      session,
      channel,
      id,
      peerId,
      onMessageHandlerError,
      onDecryptionError
    );
    return hub;
  }

  static async newPeerSession(
    transport: SimpleSyncTransport,
    id: string,
    peerId: string,
    onMessageHandlerError: (error: Error) => any | null = (error: Error) =>
      console.error(error),
    onDecryptionError?: (error: Error) => any
  ): Promise<SimplePeer> {
    const session = await EncryptedSession.newRandomSession();

    const channel = new SimpleSyncChannel(id, peerId, transport);
    const peer = new SimplePeer(
      session,
      channel,
      id,
      peerId,
      onMessageHandlerError,
      onDecryptionError
    );
    return peer;
  }
  dispose(): void {
    super.dispose();
    this.channel.dispose();
  }
}
```

Then create your sessions, register RPC handlers and start making calls 🔥

```typescript
const transportHub = new SimpleSyncTransport();
const peerA = await SimplePeer.newPeerSession(
  transportHub,
  "peer_a",
  "peer_b"
);
const peerBConfigString = await peerA.getConfigStringForPeer();
const peerB = await SimplePeer.createWithPeerFromConfigString(
  transportHub,
  peerBConfigString
);
const rpcSessionPeerA = new EncryptedRPCSession(peerA);
const rpcSessionPeerB = new EncryptedRPCSession(peerB);
rpcSessionPeerA.registerRPCFunction("ping", async () => {
  const result = await rpcSessionPeerA.callRPC("reverse", "gnop".split(""));
  return result.join("");
});
rpcSessionPeerB.registerRPCFunction("reverse", (array: any[]) =>
  array.concat([]).reverse()
);
const result = await rpcSessionPeerB.callRPC("ping");
// should print "pong"
console.log(result);
```

## ✔️ Works with Node.js

We use [conditional exports](https://nodejs.org/api/packages.html#packages_conditional_exports) to detect Node.js


## 📦 Bundler Notes

- All targets are exported with Module and CommonJS format and named exports
- No export is transpiled for sake of modern syntax
- You probably need to transpile `safe-rpc` with babel for ES5 support

## ❓ FAQ

**Why export is called `safe-rpc` instead of `fetch`?**

Using the same name of `fetch` can be confusing since API is different but still it is a fetch so using closest possible alternative. You can however, import `{ fetch }` from `safe-rpc` which is auto polyfilled for Node.js and using native otherwise.

**Why do HMAC if GCM already does authentication with GMAC?**
GMAC is known to have some problems ([Authentication Failures in NIST version of GCM ](https://csrc.nist.gov/csrc/media/projects/block-cipher-techniques/documents/bcm/joux_comments.pdf), [Cycling Attacks on GCM, GHASH
and Other Polynomial MACs and Hashes](https://eprint.iacr.org/2011/202.pdf)), and we don't want to take any chances.

**Why not transpiled?**

safe-rpc is only compatible with modern Node/Deno (v10.0.0+) and [modern browsers](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt#browser_compatibility) with support for SubtleCrypto.

## License

MIT. Copyright 2023 Zero Knowledge Labs Limited

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/safe-rpc?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/safe-rpc
[npm-downloads-src]: https://img.shields.io/npm/dm/safe-rpc?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/safe-rpc
[codecov-src]: https://img.shields.io/codecov/c/gh/OpenAssetStandards/safe-rpc/main?style=flat&colorA=18181B&colorB=F0DB4F
[codecov-href]: https://codecov.io/gh/OpenAssetStandards/safe-rpc
[bundle-src]: https://img.shields.io/bundlephobia/minzip/safe-rpc?style=flat&colorA=18181B&colorB=F0DB4F
[bundle-href]: https://bundlephobia.com/result?p=safe-rpc
[license-src]: https://img.shields.io/github/license/OpenAssetStandards/safe-rpc.svg?style=flat&colorA=18181B&colorB=F0DB4F
[license-href]: https://github.com/OpenAssetStandards/safe-rpc/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsDocs.io-reference-18181B?style=flat&colorA=18181B&colorB=F0DB4F
[jsdocs-href]: https://www.jsdocs.io/package/safe-rpc
