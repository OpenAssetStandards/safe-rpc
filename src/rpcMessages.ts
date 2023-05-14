import { RPCMessageType, RPCResponseCode, RPCResponseErrorCode } from "./rpcCodes";

interface IRPCCallMessage {
  messageType: RPCMessageType.Call;
  callId: number;
  functionName: string;
  payload?: Uint8Array;
}
interface IRPCResponseSuccessMessage {
  messageType: RPCMessageType.Response;
  callId: number;
  responseCode: RPCResponseCode.Success;
  response?: Uint8Array;
}
interface IRPCResponseErrorMessage {
  messageType: RPCMessageType.Response;
  callId: number;
  responseCode: RPCResponseErrorCode;
  errorMessage?: string;
}


export type {
  IRPCCallMessage,
  IRPCResponseSuccessMessage,
  IRPCResponseErrorMessage,

}
