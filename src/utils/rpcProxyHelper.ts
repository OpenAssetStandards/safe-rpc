import { EncryptedRPCSession } from "../encryptedRPC";

function getClassOwnUserMethods(classObject: any): string[] {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(classObject)).filter(
    (name) =>
      typeof classObject[name] === "function" &&
      name !== "constructor" &&
      name.indexOf("__") === -1 &&
      !name.startsWith("no_rpc_")
  );
}
const classProxyHandler = {
  get(target, prop, receiver) {
    return (arg?: any) => target.callRPC(prop, arg);
  },
};
function createRPCProxiedPeer(rpcSession: EncryptedRPCSession) {
  return new Proxy(rpcSession, classProxyHandler);
}

function createRPCHandlerClass<THost, TPeer>(
  rpcSession: EncryptedRPCSession,
  generateHostInstance: (peer: TPeer, rpcSession: EncryptedRPCSession) => THost,
  methodRestrictions?: { blacklist?: string[]; whitelist?: string[] }
): THost {
  const peer = createRPCProxiedPeer(rpcSession);
  const host = generateHostInstance(peer, rpcSession);
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
  if (hasWhitelist) {
    //@ts-ignore
    methodRestrictions.whitelist.forEach((name) => {
      //@ts-ignore
      if (!hasBlacklist || methodRestrictions.blacklist.indexOf(name) === -1) {
        const handler = host[name];
        if (typeof handler === "function") {
          rpcSession.registerRPCFunction(name, host[name].bind(host));
        }
      }
    });
  } else {
    const ownMethods = hasBlacklist
      ? getClassOwnUserMethods(host).filter(
          //@ts-ignore
          (x) => methodRestrictions.blacklist.indexOf(x) === -1
        )
      : getClassOwnUserMethods(host);
    ownMethods.forEach((name) => {
      const handler = host[name];
      if (typeof handler === "function") {
        rpcSession.registerRPCFunction(name, host[name].bind(host));
      }
    });
  }

  return host;
}

export { createRPCProxiedPeer, createRPCHandlerClass, getClassOwnUserMethods };
