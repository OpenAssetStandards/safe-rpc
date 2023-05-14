class NonRandomIVGenerator {
  iv: Uint8Array;
  ivU32View: Uint32Array;
  counter: number = 0;

  constructor(random7Bytes: Uint8Array){
    if(random7Bytes.length !== 7){
      throw new Error("you must provide 7 random bytes for the iv generator");
    }
    this.iv = new Uint8Array(12);
    this.ivU32View = new Uint32Array(this.iv.buffer);
    this.iv.set(random7Bytes, 5);
  }
  setCounter(value: number){
    if(value>0xffffffffff){
      throw new Error("counter overflow, must be less than 0xffffffffff");
    }
    const base = (value & 0xffffffff)>>>0;
    this.ivU32View[0] = base;
    this.iv[5] = Math.floor(value/0x100000000);
    this.counter = value;
  }
  nextIv() {
    this.setCounter(this.counter+1);
    return this.iv.slice(0,12);
  }
}

export {
  NonRandomIVGenerator,
}
