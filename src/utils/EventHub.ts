class EventHub {
  eventListeners: { [eventName: string]: ((event: any) => any)[] } = {};
  addEventListener<TEvent = any>(
    eventName: string,
    listener: (event: TEvent) => any
  ): boolean {
    if(typeof listener !== 'function'){
      throw new Error("you cannot add an event listener that is not a function");
    }
    if (
      Object.hasOwnProperty.call(this.eventListeners, eventName) &&
      Array.isArray(this.eventListeners[eventName])
    ) {
      if (this.eventListeners[eventName].indexOf(listener) === -1) {
        this.eventListeners[eventName].push(listener);
        return true;
      } else {
        return false;
      }
    } else {
      this.eventListeners[eventName] = [listener];
      return true;
    }
  }
  on<TEvent = any>(
    eventName: string,
    listener: (event: TEvent) => any
  ): boolean {
    return this.addEventListener(eventName, listener);
  }
  remove<TEvent = any>(
    eventName: string,
    listener: (event: TEvent) => any
  ): boolean {
    return this.removeEventListener(eventName, listener);
  }
  once<TEvent = any>(
    eventName: string,
    listener: (event: TEvent) => any
  ): ()=>boolean  {
    let called = false;
    const realListener = (event: TEvent)=>{
      if(called){
        return;
      }
      called = true;
      this.removeEventListener(eventName, realListener);
      listener(event);
    };
    this.addEventListener(eventName, realListener);
    return ()=>this.removeEventListener(eventName, realListener);
  }
  removeEventListener<TEvent = any>(
    eventName: string,
    listener: (event: TEvent) => any
  ): boolean {
    if (
      Object.hasOwnProperty.call(this.eventListeners, eventName) &&
      Array.isArray(this.eventListeners[eventName])
    ) {
      const listeners = this.eventListeners[eventName];
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        if (listeners.length === 0) {
          this.eventListeners[eventName] = [];
          delete this.eventListeners[eventName];
        } else {
          this.eventListeners[eventName] = listeners
            .slice(0, index)
            .concat(listeners.slice(index + 1));
        }
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  removeAllEventListeners(eventName: string) {
    this.eventListeners[eventName] = [];
    delete this.eventListeners[eventName];
  }
  notifyWithErrors(eventName: string, event: any): any[]{
    const errors : any[] = [];

    if (
      Object.hasOwnProperty.call(this.eventListeners, eventName) &&
      Array.isArray(this.eventListeners[eventName]) &&
      this.eventListeners[eventName].length
    ) {
      const listeners = this.eventListeners[eventName];
      for(const listener of listeners){
        try {
          listener(event);
        }catch(err: any){
          errors.push(err);
        }
      }
    }
    return errors;
  }

  notify(eventName: string, event: any){
    if (
      Object.hasOwnProperty.call(this.eventListeners, eventName) &&
      Array.isArray(this.eventListeners[eventName]) &&
      this.eventListeners[eventName].length
    ) {
      const listeners = this.eventListeners[eventName];
      for(const listener of listeners){
        try {
          listener(event);
        }catch(err: any){
          // do nothing
        }
      }
    }
  }

}


export {
  EventHub,
}
