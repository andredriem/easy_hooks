import { SubscriberMiddleware } from '../subscriber_middleware'
import { type HookGeneratorOptions, Subscriber } from '../subscriber'
import { useGeneric } from '../use_generic'

export interface GeneratorResponse<Data, ErrorData> {
  useHook: (parameters: string) => [data: Data | null, error: ErrorData | null, componentId: string]
  stateCompresser: <CompressedData, CompressedErrorData>(
    compressor: (
      data: Data | null,
      errorData: ErrorData | null,
      notifier: (data: CompressedData | null, errorData: CompressedErrorData | null) => void
    ) => void,
  ) => ((parameters: string) => [CompressedData | null, CompressedErrorData | null, string])
}

/**
 *  This function generates a custom hook. If none of the implemented hooks fit your needs you can use this function
 *  consider using this function to implement the best logic.
 * @param fetchData
 *  This function will be called when the hook is initialized. You will need to call the notifyObservers function
 *  to trigger state changes on the components. You will need to implement to continue fetching the data until
 *  the stopFetching function is called.
 * @param stopFetching
 *  This function will be called when all the components using this hook are unmounted (for a given parameter).
 *  This function should stop the data fetching, either by changin a relativaly global variable used by both this
 *  function and the fetchData function, or by calling a function that will stop the fetching.
 * @param options
 *  Options to customize the hook behavior currently only cacheTTLInMilliseconds is supported.
 *  This option will set the timeout for the cache to expire if all the components using the same parameter are unmounted.
 *  This is usefull to avoid fetching the data again if the component is remounted in a short period of time.
 * @returns
 */
export function generateHook<Data, ErrorData> (
  fetchData: (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void) => Promise<void>,
  stopFetching: (parameters: string) => Promise<void>,
  options?: HookGeneratorOptions
): GeneratorResponse<Data, ErrorData> {
  // Dinamically implements the subscriber class based on the parameters passed to the hook
  class HookSubscriber extends Subscriber<Data, ErrorData> {
    async fetchData (
      parameters: string,
      notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
    ): Promise<void> {
      await fetchData(parameters, notifyObservers)
    }

    async stopFetching (parameters: string): Promise<void> {
      await stopFetching(parameters)
    }
  }

  // Create a middleware that will simply call the notifyObservers function without compressing the data
  // this is usefull for the out-of-the-box hook
  class HookMiddleware extends SubscriberMiddleware<Data, ErrorData, Data, ErrorData> {
    // Change notifierMiddleware from instance member property to instance member function
    async observerFunctionMiddleware (
      data: Data | null,
      errorData: ErrorData | null,
      notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
    ): Promise<void> {
      notifyObservers(data, errorData)
    }
  }

  // Pool to manage all instances of this subscriber class
  const subscriberPool: Record<string, HookSubscriber | undefined> = {}

  // Return hook function omitting subscriber
  return {
    useHook: (parameters: string) => {
      return useGeneric<Data, ErrorData, Data, ErrorData>(
        parameters,
        subscriberPool,
        HookSubscriber,
        options ?? {},
        HookMiddleware
      )
    },
    stateCompresser: <CompressedData, CompressedErrorData>(compressor: (
      data: Data | null,
      errorData: ErrorData | null,
      notifier: (data: CompressedData | null, errorData: CompressedErrorData | null) => void
    ) => void
    ): ((parameters: string) => [CompressedData | null, CompressedErrorData | null, string]) => {
      // Creates a newlly generated middleware that will compress the data and errorData based on the compressor function
      class NewSubscriberMiddleware extends SubscriberMiddleware<Data, ErrorData, CompressedData, CompressedErrorData> {
        // Change notifierMiddleware from instance member property to instance member function
        async observerFunctionMiddleware (
          data: Data | null,
          errorData: ErrorData | null,
          notifyObservers: (data: CompressedData | null, errorData: CompressedErrorData | null) => void
        ): Promise<void> {
          compressor(
            data,
            errorData,
            notifyObservers
          )
        }
      }

      // Returns newly generated hook function
      return (parameters: string) => {
        return useGeneric<Data, ErrorData, CompressedData, CompressedErrorData>(
          parameters,
          subscriberPool,
          HookSubscriber,
          options ?? {},
          NewSubscriberMiddleware
        )
      }
    }
  }
}
