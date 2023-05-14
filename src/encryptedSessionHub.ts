import { EncryptedSession } from "./encryptedSession";
import { IAsyncRawMessageChannel, IEncryptedMessage, ISyncRawMessageChannel } from "./types";

class EncryptedSessionMessageHub {
  session: EncryptedSession;
  messageListeners: ((decryptedMessage: Uint8Array) => void)[] = [];
  channel: ISyncRawMessageChannel | IAsyncRawMessageChannel;
  onMessageHandlerError?: (error: Error) => any | null;
  onDecryptionError?: (error: Error) => any | null;

  constructor(
    session: EncryptedSession,
    channel: ISyncRawMessageChannel | IAsyncRawMessageChannel,
    onMessageHandlerError: (error: Error) => any | null = (error: Error) => console.error(error),
    onDecryptionError?: (error: Error) => any
  ) {
    this.session = session;
    this.channel = channel;
    this.onMessageHandlerError = onMessageHandlerError;
    this.onDecryptionError = onDecryptionError;
    this.onEncryptedMessage = this.onEncryptedMessage.bind(this);
    this.onDecryptedMessage = this.onDecryptedMessage.bind(this);
    this.channel.addMessageListener(this.onEncryptedMessage);
  }

  onEncryptedMessage(encryptedMessage: IEncryptedMessage) {
    if (this.session.isMessageFromPeerIdentity(encryptedMessage)) {
      this.session
        .decryptMessageFromPeer(encryptedMessage)
        .then((decryptedMessage) => this.onDecryptedMessage(decryptedMessage))
        .catch((error) => {
          console.error("error",error);
          if (typeof this.onDecryptionError === "function") {
            this.onDecryptionError(error);
          }
        });
    }
  }

  addMessageListener(callback: (message: Uint8Array) => void) {
    if (this.messageListeners.indexOf(callback) === -1) {
      this.messageListeners.push(callback);
    }
  }
  removeMessageListener(callback: (message: Uint8Array) => void) {
    const index = this.messageListeners.indexOf(callback);
    if (index !== -1) {
      this.messageListeners = this.messageListeners
        .slice(0, index)
        .concat(this.messageListeners.slice(index + 1));
    }
  }

  onDecryptedMessage(message: Uint8Array) {
    const callbacks = this.messageListeners;
    for (const c of callbacks) {
      try {
        c(message);
      } catch (err: any) {
        if (typeof this.onMessageHandlerError === "function") {
          this.onMessageHandlerError(err);
        }
      }
    }
  }
  dispose() {
    this.channel.removeMessageListener(this.onEncryptedMessage);
  }
  async send(decryptedMessage: Uint8Array){
    const encryptedMessage = await this.session.encryptMessageForPeer(decryptedMessage)
    await this.channel.sendMessageRaw(encryptedMessage);
  }
}


export {
  EncryptedSessionMessageHub,
}

