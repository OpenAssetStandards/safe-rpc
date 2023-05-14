
const hexSliceLookupTable = (function () {
  const alphabet = "0123456789abcdef";
  const table = new Array(256);
  for (let i = 0; i < 16; ++i) {
    const i16 = i * 16;
    for (let j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j];
    }
  }
  return table;
})();

function uint8ArrayToHex(u8Array: Uint8Array | number[]): string {
  let out = "";
  for (let i = 0, l = u8Array.length; i < l; i++) {
    out += hexSliceLookupTable[u8Array[i]];
  }
  return out;
}
function hexToUint8Array(hexString: string): Uint8Array {
  const len = Math.floor(hexString.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}


function compareUint8Arrays(
  a: Uint8Array,
  b: Uint8Array
): boolean {
  if(a instanceof Uint8Array && b instanceof Uint8Array){
    const aLength = a.length;
    if(aLength === b.length){
      for(let i=0;i<aLength;i++){
        if(a[i] !== b[i]){
          return false;
        }
      }
      return true;
    }
  }
  return false;
}


function readUint32LEFromUint8Array(u8Array: Uint8Array, position = 0): number {
  return (
    (u8Array[position] |
      (u8Array[position + 1] << 8) |
      (u8Array[position + 2] << 16) |
      (u8Array[position + 3] << 24)) >>>
    0
  );
}
function writeUint32LEToUint8Array(
  value: number,
  u8Array: Uint8Array,
  position = 0
) {
  u8Array[position] = value & 0xff;
  u8Array[position + 1] = (value >> 8) & 0xff;
  u8Array[position + 2] = (value >> 16) & 0xff;
  u8Array[position + 3] = (value >> 24) & 0xff;
}

function readUint16LEFromUint8Array(u8Array: Uint8Array, position = 0): number {
  return u8Array[position] | (u8Array[position + 1] << 8);
}

function writeUint16LEToUint8Array(
  value: number,
  u8Array: Uint8Array,
  position = 0
) {
  u8Array[position] = value & 0xff;
  u8Array[position + 1] = (value >> 8) & 0xff;
}

export {
  uint8ArrayToHex,
  hexToUint8Array,
  compareUint8Arrays,
  readUint32LEFromUint8Array,
  writeUint32LEToUint8Array,
  readUint16LEFromUint8Array,
  writeUint16LEToUint8Array,

}
