import { type Notifier, type NotifierConstructor } from './notifier'
import { NotifierMap } from './notifier_map'

export interface HookGeneratorOptions {
  cacheTTLInMilliseconds?: number
}

/**
 *
 */
export abstract class Subscriber<Data, ErrorData> {
  parameters: string

  currentDataCache: { data: Data | null, errorData: ErrorData | null } = { data: null, errorData: null }
  cacheEpired = false

  // Copy of all notifiers generated for this subscriber
  notifiers = new NotifierMap<Data, ErrorData>()

  // Copy of all notifiers that currently have observers
  activeNotifiers = new NotifierMap<Data, ErrorData>()
  options: HookGeneratorOptions

  constructor (parameters: string, options?: HookGeneratorOptions) {
    this.parameters = parameters
    this.options = options ?? {}
  }

  // Create a new notifier and ser it as active. Called when the first observer of an notifier is created
  async subscribe<CompressedData, CompressedErrorData>(
    notifierConstructor: NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData>,
    notifier: Notifier<Data, ErrorData, CompressedData, CompressedErrorData>): Promise<void> {
    // I have to cast this as unknown because typescript is not able to infer the type of the notifier
    // if someone knows how to fix this, please let me know
    this.activeNotifiers.set<CompressedData, CompressedErrorData>(
      notifierConstructor,
      notifier
    )

    if (this.activeNotifiers.size() === 1) {
      // Dealing with race conditions is the responsibility of whomever implements this function
      try {
        await this.fetchData(this.parameters, this.notifyObservers)
      } catch (error) {
        console.error('Error in yout fetchData function')
        console.error(error)
      }
    }
  }

  // Remove the notifier from the active notifiers list. Called when notifier observers are empty
  async unsubscribe<CompressedData, CompressedErrorData>(
    notifier: NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData>
  ): Promise<void> {
    // Remove the notifier from the active notifiers list
    // I have to cast this as unknown because typescript is not able to infer the type of the notifier
    this.activeNotifiers.delete(
      notifier
    )

    if (this.activeNotifiers.size() === 0) {
      // Dealing with race conditions is the responsibility of whomever implements this function
      try {
        await this.stopFetching(this.parameters)
        // Reset the cache
        if (this.options.cacheTTLInMilliseconds !== undefined) {
          this.currentDataCache = { data: null, errorData: null }
        } else {
          this.cacheEpired = true
          void setTimeout(() => {
            if (this.cacheEpired) {
              this.currentDataCache = { data: null, errorData: null }
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
   * Register a new notifier for this subscriber, this is somewhat different from the subscribe function, this function
   */
  registerNotifier<CompressedData, CompressedErrorData>(
    Notifier: NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData>): void {
    // Doing some casting here because typescript is not able to infer the type of the notifier
    if (this.notifiers.has(Notifier)) {
      return
    }
    this.notifiers.set<CompressedData, CompressedErrorData>(
      Notifier,
      new Notifier(this)
    )
  }

  abstract fetchData (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
  ): Promise<void>

  abstract stopFetching (parameters: string): Promise<void>

  /** Notify all observers */
  notifyObservers (data: Data | null, errorData: ErrorData | null): void {
    // Marks the cache as not expired
    if (this.cacheEpired) {
      this.cacheEpired = false
    }

    // Reset the cache
    for (const notifier of this.activeNotifiers.values()) {
      void notifier.notifierMiddleware(data, errorData, notifier.notifyObservers)
    }
  }
}
