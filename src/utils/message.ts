import { MAX_RPC_RESPONSE_CODE, RPCMessageType, RPCResponseCode, RPCResponseErrorCode } from "../rpcCodes";
import { IRPCCallMessage, IRPCResponseErrorMessage, IRPCResponseSuccessMessage } from "../rpcMessages";
import { readUint16LEFromUint8Array, readUint32LEFromUint8Array, writeUint16LEToUint8Array, writeUint32LEToUint8Array } from "./u8Array";

// Magic: 65 52 50 43 = eRPC
const E_RPC_MAGIC_0 = 0x65; // e
const E_RPC_MAGIC_1 = 0x52; // R
const E_RPC_MAGIC_2 = 0x50; // P
const E_RPC_MAGIC_3 = 0x43; // C

function writeMessageHeader(
  u8Array: Uint8Array,
  messageType: RPCMessageType,
  callId: number
) {
  u8Array[0] = E_RPC_MAGIC_0;
  u8Array[1] = E_RPC_MAGIC_1;
  u8Array[2] = E_RPC_MAGIC_2;
  u8Array[3] = E_RPC_MAGIC_3;
  u8Array[4] = messageType;
  writeUint32LEToUint8Array(callId, u8Array, 5);
}
function encodeResponseMessage(
  callId: number,
  responseCode: RPCResponseCode,
  payload?: Uint8Array
): Uint8Array {
  if (!payload || !payload.byteLength) {
    const response = new Uint8Array(10);
    writeMessageHeader(response, RPCMessageType.Response, callId);
    response[9] = responseCode;
    return response;
  }
  const responseU8View = new Uint8Array(payload.length + 10);
  writeMessageHeader(responseU8View, RPCMessageType.Response, callId);
  responseU8View[9] = responseCode;
  responseU8View.set(payload, 10);
  return responseU8View;
}
function decodeResponseMessage(
  message: Uint8Array
): IRPCResponseSuccessMessage | IRPCResponseErrorMessage {

  const messageLength = message.length;
  if(messageLength<=10){
    throw new Error("invalid message length, missing function name");
  }
  const callId = readUint32LEFromUint8Array(message, 5);
  const responseCode =  message[9]>MAX_RPC_RESPONSE_CODE?RPCResponseCode.UnknownError:message[9];
  if(responseCode === RPCResponseCode.Success){
    return {
      messageType: RPCMessageType.Response,
      callId,
      responseCode: RPCResponseCode.Success,
      response: messageLength === 10 ? undefined : message.subarray(10),
    }
  }else{
    return {
      messageType: RPCMessageType.Response,
      callId,
      responseCode: responseCode as RPCResponseErrorCode,
      errorMessage: messageLength === 10?undefined:(new TextDecoder().decode(message.subarray(10))),
    }
  }
}
function encodeCallMessage(
  callId: number,
  functionName: string,
  payload?: Uint8Array
): Uint8Array {
  const encodedFunctionName = new TextEncoder().encode(functionName);
  const payloadLength = payload ? payload.length : 0;
  const encodedFunctionNameLength = encodedFunctionName.length;
  const callU8View = new Uint8Array(
    9 + 2 + encodedFunctionNameLength + payloadLength
  );
  writeMessageHeader(callU8View, RPCMessageType.Call, callId);
  writeUint16LEToUint8Array(encodedFunctionNameLength, callU8View, 9);
  callU8View.set(encodedFunctionName, 11);
  if (payloadLength && payload) {
    callU8View.set(payload, 11 + encodedFunctionNameLength);
  }
  return callU8View;
}
function decodeCallMessage(
  message: Uint8Array,
): IRPCCallMessage {
  const messageLength = message.length;
  if(messageLength<=11){
    throw new Error("invalid message length, missing function name");
  }
  const callId = readUint32LEFromUint8Array(message, 5);
  const functionNameLength = readUint16LEFromUint8Array(message, 9);
  const functionNameEnd = 11+functionNameLength;
  if(messageLength<(functionNameEnd)){
    throw new Error("invalid function name length");
  }
  const functionName = new TextDecoder().decode(message.subarray(11, functionNameEnd));
  if(functionNameEnd === messageLength){
    return {
      messageType: RPCMessageType.Call,
      callId,
      functionName,
    }
  }else{
    return {
      messageType: RPCMessageType.Call,
      functionName,
      callId,
      payload: message.subarray(functionNameEnd),
    }
  }
}

function readMessageType(message: Uint8Array): RPCMessageType {
  if(
      message.length > 9 &&
      message[0] === E_RPC_MAGIC_0 &&
      message[1] === E_RPC_MAGIC_1 &&
      message[2] === E_RPC_MAGIC_2 &&
      message[3] === E_RPC_MAGIC_3
  ){
    const messageType = message[4];
    if(messageType === RPCMessageType.Call || messageType === RPCMessageType.Response){
      return messageType;
    }
  }
  return RPCMessageType.Unknown;
}

function decodeMessage(message: Uint8Array): IRPCCallMessage | IRPCResponseSuccessMessage | IRPCResponseErrorMessage{
  const messageType = readMessageType(message);
  if(messageType === RPCMessageType.Call){
    return decodeCallMessage(message);
  }else if(messageType === RPCMessageType.Response){
    return decodeResponseMessage(message);
  }else{
    throw new Error("invalid message header");
  }
}

export {
  decodeMessage,
  encodeCallMessage,
  encodeResponseMessage,
}
