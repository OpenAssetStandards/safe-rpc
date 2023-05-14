import {
  EncryptedRPCSession,
  EncryptedSession,
  EncryptedSessionMessageHub,
  IEncryptedMessage,
  ISyncRawMessageChannel,
  deserializePeerSessionConfig,
  serializePeerSessionConfig,
} from "../src/node";
import {
  SimpleSyncTransport,
  ISimpleSyncTransportChannelHandler,
} from "../src/simpleTransport";

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


describe("safe-rpc", () => {
  it("simple rpc test", async () => {
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
    expect(result).toBe("pong");
  });
});
