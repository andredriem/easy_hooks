import { type Subscriber } from './subscriber'
import { type ObserverFunction } from './types'

// Notifier constructor type shortcut
export type NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData> =
    new (
      ...args: ConstructorParameters<typeof Notifier<Data, ErrorData, CompressedData, CompressedErrorData>>
    ) => Notifier<Data, ErrorData, CompressedData, CompressedErrorData>

/** Class to handle notifiers */
export abstract class Notifier<Data, ErrorData, CompressedData, CompressedErrorData> {
  currentDataCache: { data: CompressedData | null, errorData: CompressedErrorData | null } =
    { data: null, errorData: null }

  // Store all observer functions
  observerFunctionMap = new Map<string, ObserverFunction<CompressedData, CompressedErrorData>>()

  // Reference to the subscriber
  subscriber: Subscriber<Data, ErrorData>

  constructor (
    subscriber: Subscriber<Data, ErrorData>
  ) {
    this.subscriber = subscriber
  }

  // Class to be defined by end user, it can decided to call the notifyObservers function or not
  // and how to compress the data
  abstract notifierMiddleware (
    data: Data | null,
    errorData: ErrorData | null,
    notifyObservers: (data: CompressedData | null, errorData: CompressedErrorData | null) => void
  ): Promise<void>

  notifyObservers (compressedData: CompressedData | null, compressedErrorData: CompressedErrorData | null): void {
    this.currentDataCache = { data: compressedData, errorData: compressedErrorData }

    for (const observerFunction of this.observerFunctionMap.values()) {
      observerFunction(compressedData, compressedErrorData)
    }
  }

  subscribe (uniqueId: string, observerFunction: ObserverFunction<CompressedData, CompressedErrorData>): void {
    this.observerFunctionMap.set(uniqueId, observerFunction)

    // If the map size is 1, it means we need to call the subscribe method of the subscriber
    if (this.observerFunctionMap.size === 1) {
      // I'm casting this as unknown because typescript is not able to infer the type of the notifier
      // since this libary uses too much metaprogramming
      this.subscriber.subscribe<CompressedData, CompressedErrorData>(
        this.constructor as NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData>,
        this
      ).catch((error) => {
        console.error('Error in your subscribe function, this might result in your data not being fetched')
        console.error(error)
      })
    }
  }

  unsubscribe (uniqueId: string): void {
    this.observerFunctionMap.delete(uniqueId)

    // If the map size is 0, it means we need to call the unsubscribe method of the subscriber
    if (this.observerFunctionMap.size === 0) {
      // I'm casting this as unknown because typescript is not able to infer the type of the notifier
      // since this libary uses too much metaprogramming
      this.subscriber.unsubscribe<CompressedData, CompressedErrorData>(
        this.constructor as NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData>)
        .then(() => {
          // Reset the cache if the cahe expired
          if (this.subscriber.cacheEpired) {
            this.currentDataCache = { data: null, errorData: null }
          }
        })
        .catch((error) => {
          console.error('Error in your unsubscribe function, this might result in memory leaks')
          console.error(error)
        })
    }
  }
}
