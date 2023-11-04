import { type SubscriberMiddleware, type SubscriberMiddlewareConstructor } from './subscriber_middleware'
import { SubscriberMiddlewareMap } from './subscriber_middleware_map'

export interface HookGeneratorOptions {
  cacheTTLInMilliseconds?: number
}

/**
 * This class represents a subscriber for an specific parameter.
 * This class is responsible for fetching the data and notifying the observers trough their middleware.
 */
export abstract class Subscriber<Data, ErrorData> {
  parameters: string
  currentDataCache: { data: Data | null, errorData: ErrorData | null } = { data: null, errorData: null }
  cacheEpired = false
  // Copy of all middlewares generated for this subscriber
  subscriberMiddlewares = new SubscriberMiddlewareMap<Data, ErrorData>()
  // Copy of all middlewares that currently have observers
  activeSubscriberMiddleware = new SubscriberMiddlewareMap<Data, ErrorData>()
  options: HookGeneratorOptions

  constructor (parameters: string, options?: HookGeneratorOptions) {
    this.parameters = parameters
    this.options = options ?? {}
  }

  /** Called when a componnent subscribes, triggered by middleware.
   * Might trigger the fetchData function if it's the first active middleware to subscribe
  */
  async subscribe<CompressedData, CompressedErrorData>(
    subscriberMiddlewareConstructor: SubscriberMiddlewareConstructor<Data, ErrorData, CompressedData, CompressedErrorData>,
    subscriberMiddleware: SubscriberMiddleware<Data, ErrorData, CompressedData, CompressedErrorData>
  ): Promise<void> {
    this.activeSubscriberMiddleware.set<CompressedData, CompressedErrorData>(
      subscriberMiddlewareConstructor,
      subscriberMiddleware
    )

    if (this.activeSubscriberMiddleware.size() === 1) {
      // Initializes the data fetching by triggering it for the first time
      // whis will trigger the observerFunctionMiddleware of the middlewares
      try {
        await this.fetchData(this.parameters, this.notifyObservers)
      } catch (error) {
        console.error('Error in yout fetchData function')
        console.error(error)
      }
    } else {
      // We need to calculate the cache for this middleware
      // we can do that by triggering the observerFunctionMiddleware
      // with the current cached data
      if (subscriberMiddleware.cacheEpired) {
        try {
          subscriberMiddleware.observerFunctionMiddleware(
            this.currentDataCache.data,
            this.currentDataCache.errorData,
            subscriberMiddleware.notifyObservers
          )
        } catch (error) {
          console.error('Error in your observerFunctionMiddleware function')
          console.error(error)
        }
      }
    }
  }

  /**
   * Called when a middleware unsubscribes, triggered by middleware.
   * Might trigger the stopFetching function if it's the last active middleware to unsubscribe.
   *
   * If an stopFetching function is called the cache of subcriber and all middlewares will be reseted
   * unless the cacheTTLInMilliseconds is set in the options. Witch will cause the cache to be reseted
   * later. This is useful when you wan't to keep the cache alive for a while if you are expecting
   * some componnents to pop up again really soon (soon as defined by cacheTTLInMilliseconds).
   */
  async unsubscribe<CompressedData, CompressedErrorData>(
    subscriberMiddleware: SubscriberMiddlewareConstructor<Data, ErrorData, CompressedData, CompressedErrorData>
  ): Promise<void> {
    // Remove the notifier from the active notifiers list
    // I have to cast this as unknown because typescript is not able to infer the type of the notifier
    this.activeSubscriberMiddleware.delete(
      subscriberMiddleware
    )

    if (this.activeSubscriberMiddleware.size() === 0) {
      // Dealing with race conditions is the responsibility of whomever implements this function
      try {
        await this.stopFetching(this.parameters)
        // Reset the cache
        if (this.options.cacheTTLInMilliseconds !== undefined) {
          this.expireCache()
        } else {
          this.cacheEpired = true
          void setTimeout(() => {
            if (this.cacheEpired) {
              this.expireCache()
            }
          }, this.options.cacheTTLInMilliseconds)
        }
      } catch (error) {
        console.log(
          'Error in your stopFetching function. If yout fetching function did not stoped correctly it ' +
          'might cause memory leaks'
        )
        console.error(error)
      }
    }
  }

  /**
   * Expires all the cache in the same event loop. This will guarantee that newly subscribed components
   * will get the default data and errorData.
   */
  expireCache (): void {
    this.currentDataCache = { data: null, errorData: null }
    for (const subcriberMiddleware of this.subscriberMiddlewares.values()) {
      subcriberMiddleware.currentDataCache = { data: null, errorData: null }
    }
  }

  /**
   * Register a new middleware class for this subscriber and initialize an instance of it based on the parameters.
   */
  registerMiddleware<CompressedData, CompressedErrorData>(
    Notifier: SubscriberMiddlewareConstructor<Data, ErrorData, CompressedData, CompressedErrorData>): void {
    // Doing some casting here because typescript is not able to infer the type of the notifier
    if (this.subscriberMiddlewares.has(Notifier)) {
      return
    }
    this.subscriberMiddlewares.set<CompressedData, CompressedErrorData>(
      Notifier,
      new Notifier(this)
    )
  }

  /**
   * This is a function that should be implemented by the generateHook function.
   * This should manage the data collection and notify the observers. Witch will trigger a
   * notify ot the middlewares, then the render of the components.
   */
  abstract fetchData (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
  ): Promise<void>

  /**
   * This is a function that should be implemented by the generateHook function.
   * This is called after the last middleware unsubscribes. This should stop the fetching
   * any data.
   */
  abstract stopFetching (parameters: string): Promise<void>

  /** Notify all observers */
  notifyObservers (data: Data | null, errorData: ErrorData | null): void {
    // Marks the cache as not expired, since new data just came ins
    if (this.cacheEpired) {
      this.cacheEpired = false
    }

    // Notify all active middlewares
    for (const middleware of this.activeSubscriberMiddleware.values()) {
      try {
        middleware.observerFunctionMiddleware(data, errorData, middleware.notifyObservers)
      } catch (error) {
        console.error('Error in your observerFunctionMiddleware function')
        console.error(error)
      }
    }
  }
}
