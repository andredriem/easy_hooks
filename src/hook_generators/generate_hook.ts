import { Notifier } from '../notifier'
import { type HookGeneratorOptions, Subscriber } from '../subscriber'
import { useGeneric } from '../use_generic'

export interface GeneratorResponse<Data, ErrorData> {
  hook: (parameters: string) => [data: Data | null, error: ErrorData | null, componentId: string]
  stateCompresser: <CompressedData, CompressedErrorData>(
    compressor: (
      data: Data | null,
      errorData: ErrorData | null,
      notifier: (data: CompressedData | null, errorData: CompressedErrorData | null) => void
    ) => void,
  ) => ((parameters: string) => [CompressedData | null, CompressedErrorData | null, string])
}

/**
   */
export function generateHook<Data, ErrorData> (
  fetchData: (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void) => Promise<void>,
  stopFetching: (parameters: string) => Promise<void>,
  options?: HookGeneratorOptions
): GeneratorResponse<Data, ErrorData> {
  // Implements subscriber class for this hook
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

  class HookNotifier extends Notifier<Data, ErrorData, Data, ErrorData> {
    // Change notifierMiddleware from instance member property to instance member function
    async notifierMiddleware (
      data: Data | null,
      errorData: ErrorData | null,
      notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
    ): Promise<void> {
      notifyObservers(data, errorData)
    }
  }

  const subscriberPool: Record<string, HookSubscriber | undefined> = {}

  // Return hook function omitting subscriber
  return {
    hook: (parameters: string) => {
      return useGeneric<Data, ErrorData, Data, ErrorData>(
        parameters,
        subscriberPool,
        HookSubscriber,
        options ?? {},
        HookNotifier
      )
    },
    stateCompresser: <CompressedData, CompressedErrorData>(compressor: (
      data: Data | null,
      errorData: ErrorData | null,
      notifier: (data: CompressedData | null, errorData: CompressedErrorData | null) => void
    ) => void
    ): ((parameters: string) => [CompressedData | null, CompressedErrorData | null, string]) => {
      class NewHookNotifier extends Notifier<Data, ErrorData, CompressedData, CompressedErrorData> {
        // Change notifierMiddleware from instance member property to instance member function
        async notifierMiddleware (
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

      return (parameters: string) => {
        return useGeneric<Data, ErrorData, CompressedData, CompressedErrorData>(
          parameters,
          subscriberPool,
          HookSubscriber,
          options ?? {},
          NewHookNotifier
        )
      }
    }
  }
}
