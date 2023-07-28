
import React, { useId, useEffect, useState } from 'react';


abstract class Subscriber<Data, ErrorData>{


    parameters: string = "";


    constructor(parameters: string) {
        this.parameters = parameters;
    }

    abstract fetchData(parameters: string, notifyObservers: (data: Data | ErrorData, isData: boolean) => void): Promise<void>
    abstract stopFetching(parameters: string): Promise<void>

    observersFunctions: Record<string, (data: Data | ErrorData, isData: boolean) => void> = {};

    subscribe(componentId: string, callback: (data: Data | ErrorData, isData: boolean) => void) {
        this.observersFunctions[componentId] = callback;

        if (Object.entries(this.observersFunctions).length === 1) {
            void this.fetchData(componentId, this.notifyObservers)
        }

    }

    unsubscribe(componentId: string) {
        delete this.observersFunctions[componentId];

        if (Object.entries(this.observersFunctions).length === 0) {
            void this.stopFetching(componentId);
        }
    }

    notifyObservers(data: Data | ErrorData, isData: boolean) {
        for (const observerFunction of Object.values(this.observersFunctions)) {
            observerFunction(data, isData);
        }
    }


}

function useGeneric<Data, ErrorData>(parameter: string, subscriberPool: Record<string, Subscriber<Data, ErrorData> | undefined>, subcriberClass: new (parameters: string) => Subscriber<Data, ErrorData>): 
    [data: Data | null, error: ErrorData | null, componentId: string] {
    const componentId = useId();
    const [genericData, setGenericData] = useState<Data | null>(null);
    const [errorResponse, setErrorResponse] = useState<ErrorData | null>(null);

    useEffect(() => {

        let mounted = true;

        // Check if subscriber is parameters is already created
        let subscriber = subscriberPool[parameter];
        if(subscriber === undefined) {
            subscriber = new subcriberClass(parameter);
            subscriberPool[parameter] = subscriber;
        }

        if (!Object.hasOwn(subscriber.observersFunctions, parameter)) {
            subscriber.subscribe(componentId, (data: unknown, isData: boolean) => {

                if (!mounted) {
                    return;
                }

                if (isData) {
                    setGenericData(data as Data);
                    setErrorResponse(null);
                } else {
                    setGenericData(null);
                    setErrorResponse(data as ErrorData);
                }
            })
        }

        return function cleanup() {
            subscriber?.unsubscribe(componentId);
            mounted = false;
        }
    }, [componentId, parameter, subscriberPool, subcriberClass]);

    return [genericData, errorResponse, componentId];
}


export function generateHook<Data, ErrorData>(
    fetchData: (parameters: string, notifyObservers: (data: Data | ErrorData, isData: boolean) => void) => Promise<void>,
    stopFetching: (parameters: string) => Promise<void>
): (parameters: string) => [data: Data | null, error: ErrorData | null, componentId: string] {
    
    // Implements subscriber class for this hook
    class HookSubscriber extends Subscriber<Data, ErrorData> {
        async fetchData(parameters: string, notifyObservers: (data: Data | ErrorData, isData: boolean) => void): Promise<void> {
            await fetchData(parameters, notifyObservers);
        }
        async stopFetching(parameters: string): Promise<void> {
            await stopFetching(parameters);
        }
    }

    const subscriberPool: Record<string, HookSubscriber | undefined> = {};

    // Return hook function ommiting subscriber
    return (parameters: string) => {
        return useGeneric<Data, ErrorData>(parameters, subscriberPool, HookSubscriber);
    }
}


// Generate hooks that fetches periodically
export function generatePeriodicHook<Data, ErrorData>(
    fetchData: (parameters: string, notifyObservers: (data: Data | ErrorData, isData: boolean) => void) => Promise<void>,
    interval: number
): (parameters: string) => [data: Data | null, error: ErrorData | null, componentId: string] {
    

    // Implements subscriber class for this hook
    class HookSubscriber extends Subscriber<Data, ErrorData> {

        poolingPid: number | undefined = undefined;

        async trueFetchData(parameters: string, notifyObservers: (data: Data | ErrorData, isData: boolean) => void): Promise<void>{
            this.poolingPid = setInterval(async () => {
                await fetchData(parameters, notifyObservers);
            }, interval);
        }

        async fetchData(parameters: string, notifyObservers: (data: Data | ErrorData, isData: boolean) => void): Promise<void> {
            await this.trueFetchData(parameters, notifyObservers);
        }
        
        async stopFetching(parameters: string): Promise<void> {
            if(this.poolingPid !== undefined)
                clearInterval(this.poolingPid);
        }
    }

    const subscriberPool: Record<string, HookSubscriber | undefined> = {};

    // Return hook function ommiting subscriber
    return (parameters: string) => {
        return useGeneric<Data, ErrorData>(parameters, subscriberPool, HookSubscriber);
    }
}

// Generate actionCable hooks
export function actionCableHook<Data, ErrorData>(
    channelName: string,
): (parameters: string) => [data: Data | null, error: ErrorData | null, componentId: string] {

    const ActionCable = window.ActionCable;

    if (ActionCable === undefined) {
        throw new Error("ActionCable is not defined, please make sure your rails app is using actioncable or the actioncable variable is defined before using this hook\n" +
            "You can also install the ActionCable library from npm: npm install actioncable\n");
    }

    let cable: any;
    let subscription: any;

    const fetchData = async (parameters: string, notifyObservers: (data: Data | ErrorData, isData: boolean) => void) => {
        cable = window.ActionCable.createConsumer();
        subscription = cable.subscriptions.create({ channel: channelName, id: parameters }, {
            received(data) {
                notifyObservers(data, true);
            },
            disconnected() {
                console.warn(`Disconnected from channel: ${channelName} with id: ${parameters}`);
            },
        });

        return { cable, subscription };
    };

    const stopFetching = () => {
        if (subscription) {
            cable.subscriptions.remove(subscription);
        }
        if (cable) {
            cable.disconnect();
        }
    };

    class HookSubscriber extends Subscriber<Data, ErrorData> {

        async fetchData(parameters: string, notifyObservers: (data: Data | ErrorData, isData: boolean) => void): Promise<void> {
            await fetchData(parameters, notifyObservers);
        }
        async stopFetching(parameters: string): Promise<void> {
            await stopFetching();
        }
    }

    const subscriberPool: Record<string, HookSubscriber | undefined> = {};

    // Return hook function ommiting subscriber
    return (parameters: string) => {
        return useGeneric<Data, ErrorData>(parameters, subscriberPool, HookSubscriber);
    }

}
