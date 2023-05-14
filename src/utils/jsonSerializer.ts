import { IDataSerializer } from "../types";

function serializeJSONToBytes(obj: any): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj));
}
function deserializeJSONFromBytes(data: Uint8Array | ArrayBuffer): any {
  return JSON.parse(new TextDecoder().decode(data));
}
const jsonSerializer: IDataSerializer = {
  serialize: serializeJSONToBytes,
  deserialize: deserializeJSONFromBytes,
}
export {
  serializeJSONToBytes,
  deserializeJSONFromBytes,
  jsonSerializer,
}
