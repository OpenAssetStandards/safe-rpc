interface ISimpleSyncTransportChannelHandler {
  notifyMessage(message: any): any;
}
class SimpleSyncTransport {
  peerMap: {[id: string]: ISimpleSyncTransportChannelHandler} = {};
  registerPeer(id: string, channel: ISimpleSyncTransportChannelHandler){
    if(Object.hasOwnProperty.call(this.peerMap, id)){
      throw new Error("a peer with the id '"+id+"' already exists");
    }
    this.peerMap[id] = channel;
  }
  unregisterPeer(id: string){
    delete this.peerMap[id];
  }
  sendMessage(destinationId: string, message: any){
    if(Object.hasOwnProperty.call(this.peerMap, destinationId)){
      this.peerMap[destinationId].notifyMessage(message);
    }else{
      console.warn("sendMessage - no peer with id '"+destinationId+"'");
    }
  }
}

export type {
  ISimpleSyncTransportChannelHandler,
}

export {
  SimpleSyncTransport,
}
