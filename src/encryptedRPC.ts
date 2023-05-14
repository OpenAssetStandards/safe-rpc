import { EncryptedSessionMessageHub } from "./encryptedSessionHub";
import { RPCMessageType, RPCResponseCode, getRPCResponseCodeName } from "./rpcCodes";
import { IRPCCallMessage, IRPCResponseErrorMessage, IRPCResponseSuccessMessage } from "./rpcMessages";
import { IDataSerializer, TRPCHandlerItem, TRPCHandlerMap } from "./types";
import {
  deserializeJSONFromBytes,
  serializeJSONToBytes,
} from "./utils/jsonSerializer";
import {
  decodeMessage,
  encodeCallMessage,
  encodeResponseMessage,
} from "./utils/message";
import { createRPCHandlerClass } from "./utils/rpcProxyHelper";

class EncryptedRPCSession {
  hub: EncryptedSessionMessageHub;
  serializer: IDataSerializer;
  rpcHandlerRegistry: { [functionName: string]: (arg?: any) => any } = {};
  callIdCounter = 0;
  awaitingCalls: {
    [callId: number]: {
      resolve: (arg?: any) => any;
      reject: (error: Error) => any;
    };
  } = {};

  constructor(hub: EncryptedSessionMessageHub, serializer?: IDataSerializer) {
    this.hub = hub;
    this.serializer = serializer || {
      serialize: serializeJSONToBytes,
      deserialize: deserializeJSONFromBytes,
    };
    this.onEncodedMessage = this.onEncodedMessage.bind(this);
    hub.addMessageListener(this.onEncodedMessage);
  }
  registerRPCFunction(functionName: string, rpcHandler: (arg?: any) => any) {
    if (functionName.length > 65535) {
      throw new Error("function name must be less than 65535 characters");
    } else if (typeof this.rpcHandlerRegistry[functionName] === "function") {
      throw new Error(
        "a function with the name '" +
          functionName +
          "' has already been registered"
      );
    }
    this.rpcHandlerRegistry[functionName] = rpcHandler;
  }
  callRPC(functionName: string, arg?: any): Promise<any> {
    const callId = this.callIdCounter++;
    return new Promise((resolve, reject) => {
      try {
        const serializedArg = arg ? this.serializer.serialize(arg) : undefined;
        this.awaitingCalls[callId] = { resolve, reject };
        this.hub
          .send(encodeCallMessage(callId, functionName, serializedArg))
          .then(() => 0)
          .catch((err) => {
            delete this.awaitingCalls[callId];
            reject(err);
          });
      } catch (err) {
        return reject(err);
      }
    });
  }

  async onEncodedCallMessage(m: IRPCCallMessage) {
    if (
      m.functionName.length &&
      Object.hasOwnProperty.call(this.rpcHandlerRegistry, m.functionName) &&
      typeof this.rpcHandlerRegistry[m.functionName] === "function"
    ) {
      let result: any;

      try {
        if (m.payload) {
          const arg = this.serializer.deserialize(m.payload);
          result = await this.rpcHandlerRegistry[m.functionName](arg);
        }else{
          result = await this.rpcHandlerRegistry[m.functionName]();
        }
      } catch (err) {
        return this.hub.send(
          encodeResponseMessage(
            m.callId,
            RPCResponseCode.RuntimeError,
            new TextEncoder().encode(err + "")
          )
        );
      }

      if (typeof result !== "undefined") {
        let encodedResponsePayload: any;
        try {
          encodedResponsePayload = this.serializer.serialize(result);
        } catch (err) {
          return this.hub.send(
            encodeResponseMessage(
              m.callId,
              RPCResponseCode.EncodeResponseError,
              new TextEncoder().encode(err + "")
            )
          );
        }
        return this.hub.send(
          encodeResponseMessage(
            m.callId,
            RPCResponseCode.Success,
            encodedResponsePayload
          )
        );
      } else {
        return this.hub.send(
          encodeResponseMessage(m.callId, RPCResponseCode.Success)
        );
      }
    } else {
      return this.hub.send(
        encodeResponseMessage(m.callId, RPCResponseCode.UnregisteredFunctionError)
      );
    }
  }

  onEncodedResponseMessage(m: IRPCResponseSuccessMessage | IRPCResponseErrorMessage) {
    if (
      Object.hasOwnProperty.call(this.awaitingCalls, m.callId) &&
      this.awaitingCalls[m.callId] &&
      typeof this.awaitingCalls[m.callId] === "object"
    ) {
      const handler = this.awaitingCalls[m.callId];
      delete this.awaitingCalls[m.callId];
      if (m.responseCode === RPCResponseCode.Success) {
        try{
          if(m.response){
            let decodedResponse: any;
            try {
              decodedResponse = this.serializer.deserialize(m.response);
            } catch (err) {
              return handler.reject(new Error("error decoding response: " + err));
            }
            handler.resolve(decodedResponse);
          }else{
            handler.resolve();
          }
        }catch(err){
          //ignore error
        }
      }else{
        handler.reject(
          new Error(
            getRPCResponseCodeName(m.responseCode)+(m.errorMessage?(": "+m.errorMessage):"")
          )
        );
      }
    }
  }
  onEncodedMessage(encodedMessage: Uint8Array) {
    const m = decodeMessage(encodedMessage);
    if(m.messageType === RPCMessageType.Call){
      this.onEncodedCallMessage(m)
        .then(() => 0)
        .catch((err) => console.error("error in on enc call msg", err));
    }else if(m.messageType === RPCMessageType.Response){
      this.onEncodedResponseMessage(m);
    }
  }
  dispose() {
    this.hub.dispose();
  }
  registerHandlerArray(handlers: TRPCHandlerItem[]): EncryptedRPCSession {
    handlers.forEach((x) => this.registerRPCFunction(x.name, x.handler));
    return this;
  }
  registerHandlerMap(handlers: TRPCHandlerMap): EncryptedRPCSession {
    if (handlers instanceof Map) {
      for (const [name, handler] of handlers) {
        this.registerRPCFunction(name, handler);
      }
    } else {
      Object.keys(handlers).forEach((name) => {
        this.registerRPCFunction(name, handlers[name]);
      });
    }
    return this;
  }
  /*
  registerHandlerClassBasic(handlerClassInstance: any) {
    getClassOwnUserMethods(handlerClassInstance).forEach((name) => {
      this.registerRPCFunction(
        name,
        handlerClassInstance[name].bind(handlerClassInstance)
      );
    });
  }*/
  withHandlers(
    handlers: TRPCHandlerItem[] | TRPCHandlerMap,
    methodRestrictions?: { blacklist?: string[]; whitelist?: string[] }
  ): EncryptedRPCSession {
    const hasMethodRestrictions =
      typeof methodRestrictions === "object" && methodRestrictions;
    const hasBlacklist =
      hasMethodRestrictions &&
      typeof methodRestrictions.blacklist === "object" &&
      Array.isArray(methodRestrictions.blacklist);
    const hasWhitelist =
      hasMethodRestrictions &&
      typeof methodRestrictions.whitelist === "object" &&
      Array.isArray(methodRestrictions.whitelist);

    if (Array.isArray(handlers)) {
      const realHandlers = hasMethodRestrictions
        ? handlers.filter(
            (x) =>
              (!hasWhitelist || //@ts-ignore
                methodRestrictions.whitelist.indexOf(x.name) !== -1) &&
              (!hasBlacklist || //@ts-ignore
                methodRestrictions.blacklist.indexOf(x.name) === -1)
          )
        : handlers;
      this.registerHandlerArray(realHandlers);
    } else if (handlers instanceof Map) {
      for (const [name, handler] of handlers) {
        if (
          !hasWhitelist || //@ts-ignore
          methodRestrictions.whitelist.indexOf(name) !== -1
        ) {
          if (
            !hasBlacklist || //@ts-ignore
            methodRestrictions.blacklist.indexOf(name) === -1
          ) {
            this.registerRPCFunction(name, handler);
          }
        }
      }
    } else {
      Object.keys(handlers).forEach((name) => {
        if (
          !hasWhitelist || //@ts-ignore
          methodRestrictions.whitelist.indexOf(name) !== -1
        ) {
          if (
            !hasBlacklist || //@ts-ignore
            methodRestrictions.blacklist.indexOf(name) === -1
          ) {
            this.registerRPCFunction(name, handlers[name]);
          }
        }
      });
    }
    return this;
  }
  registerHandlerClass<THost, TPeer>(
    generateHostInstance: (
      peer: TPeer,
      rpcSession: EncryptedRPCSession
    ) => THost,
    methodRestrictions?: { blacklist?: string[]; whitelist?: string[] }
  ): THost {
    return createRPCHandlerClass<THost, TPeer>(
      this,
      generateHostInstance,
      methodRestrictions
    );
  }
}

export { EncryptedRPCSession };
