import { type Subscriber } from './subscriber'
import { type ObserverFunction } from './types'

export type SubscriberMiddlewareConstructor<Data, ErrorData, CompressedData, CompressedErrorData> =
    new (
      ...args: ConstructorParameters<typeof SubscriberMiddleware<Data, ErrorData, CompressedData, CompressedErrorData>>
    ) => SubscriberMiddleware<Data, ErrorData, CompressedData, CompressedErrorData>

/**
 * This class represents a middleware that can be used to compress the data and errorData of a subscriber.
 * this class handles it's own observers and notifies, and updates them accordingly when the fetchData is called
 * by the subscriber.
 */
export abstract class SubscriberMiddleware<Data, ErrorData, CompressedData, CompressedErrorData> {
  currentDataCache: { data: CompressedData | null, errorData: CompressedErrorData | null } =
    { data: null, errorData: null }

  cacheEpired = true

  instanceInitialized = false

  // Store all observer functions
  observerFunctionMap = new Map<string, ObserverFunction<CompressedData, CompressedErrorData>>()

  // Reference to the subscriber
  subscriber: Subscriber<Data, ErrorData>

  constructor (
    subscriber: Subscriber<Data, ErrorData>
  ) {
    this.subscriber = subscriber
    // when this class is created we will call the middleware function immediately so the
    // currentDataCache is populated
    try {
      this.observerFunctionMiddleware(
        this.subscriber.currentDataCache.data,
        this.subscriber.currentDataCache.errorData,
        this.notifyObservers
      )
    } catch (error) {
      console.error('Error in your observerFunctionMiddleware function')
      console.error(error)
    }

    // Mark the instance as initialized so it can start notifying the observers
    this.instanceInitialized = true
  }

  // Class to be defined by end user, it can decided to call the notifyObservers function or not
  // and how to compress the data
  abstract observerFunctionMiddleware (
    data: Data | null,
    errorData: ErrorData | null,
    notifyObservers: (data: CompressedData | null, errorData: CompressedErrorData | null) => void
  ): void

  notifyObservers (compressedData: CompressedData | null, compressedErrorData: CompressedErrorData | null): void {
    this.currentDataCache = { data: compressedData, errorData: compressedErrorData }
    this.cacheEpired = false

    // We only want to notify the observers if the instance is initialized
    // since the observerFunctionMiddleware is called when the instance is created and we don't want to make wasteful
    // calls to the observer functions
    if (this.instanceInitialized) {
      for (const observerFunction of this.observerFunctionMap.values()) {
        observerFunction(compressedData, compressedErrorData)
      }
    }
  }

  /**
   * This function is called when the component managed by this middleware is mounted.
   * It calls the subscribe function of the subscriber to eaither initialize the data or get the cached data.
   */
  subscribe (uniqueId: string, observerFunction: ObserverFunction<CompressedData, CompressedErrorData>): void {
    this.observerFunctionMap.set(uniqueId, observerFunction)

    // If the map size is 1, it means we need to call the subscribe method of the subscriber
    if (this.observerFunctionMap.size === 1) {
      this.subscriber.subscribe<CompressedData, CompressedErrorData>(
        // Need this casting because typescript is not able to infer the type of the class constructor
        this.constructor as SubscriberMiddlewareConstructor<Data, ErrorData, CompressedData, CompressedErrorData>,
        this
      ).catch((error) => {
        console.error('Error in your subscribe function, this might result in your data not being fetched')
        console.error(error)
      })
    }
  }

  unsubscribe (uniqueId: string): void {
    this.observerFunctionMap.delete(uniqueId)
    this.cacheEpired = true

    // If the map size is 0, it means we need to call the unsubscribe method of the subscriber
    if (this.observerFunctionMap.size === 0) {
      this.subscriber.unsubscribe<CompressedData, CompressedErrorData>(
        // Need this casting because typescript is not able to infer the type of the class constructor
        this.constructor as SubscriberMiddlewareConstructor<Data, ErrorData, CompressedData, CompressedErrorData>)
        .catch((error) => {
          console.error('Error in your unsubscribe function, this might result in memory leaks')
          console.error(error)
        })
    }
  }
}
