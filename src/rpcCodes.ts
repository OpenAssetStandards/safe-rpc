enum RPCResponseCode {
  Success = 0,
  UnknownError = 1,
  UnregisteredFunctionError = 2,
  RuntimeError = 3,
  DecodeResponseError = 4,
  DecodeArgumentsError = 5,
  EncodeResponseError = 6,

}
type RPCResponseErrorCode =  RPCResponseCode.UnknownError | RPCResponseCode.UnregisteredFunctionError | RPCResponseCode.RuntimeError | RPCResponseCode.DecodeResponseError | RPCResponseCode.DecodeArgumentsError | RPCResponseCode.EncodeResponseError;
const MAX_RPC_RESPONSE_CODE = 6;
enum RPCMessageType {
  Call = 0,
  Response = 1,
  Unknown = 2,
}

function getRPCResponseCodeName(code: RPCResponseCode): string {
  if(code === RPCResponseCode.Success){
    return "Success";
  }else if(code === RPCResponseCode.UnregisteredFunctionError){
    return "UnregisteredFunctionError";
  }else if(code === RPCResponseCode.RuntimeError){
    return "RuntimeError";
  }else if(code === RPCResponseCode.DecodeResponseError){
    return "DecodeResponseError";
  }else if(code === RPCResponseCode.DecodeArgumentsError){
    return "DecodeArgumentsError";
  }else{
    return "UnknownError";
  }
}
export type {
  RPCResponseErrorCode,
}
export {
  RPCResponseCode,
  RPCMessageType,
  MAX_RPC_RESPONSE_CODE,
  getRPCResponseCodeName,
}
