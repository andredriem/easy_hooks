import { generateHook, type GeneratorResponse } from './generate_hook'

/**
 * Generates a periodic hook that fetches data at a specified interval.
 * @param fetchData Function that fetches data and notifies observers of the result.
 * @param interval Interval in milliseconds at which to fetch data.
 * @param options Optional configuration options for the hook.
 * @returns An object containing the hook's response data and error data, as well as a function to stop fetching.
 */
export function generatePeriodicHook<Data, ErrorData> (
  fetchData: (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void) => Promise<void>,
  interval: number,
  options?: {
    shouldRetryOnError?: boolean
    errorInterval?: number | number[]
    delayStopFetching?: number
    maximumRetryCount?: number
    displayThisErrorDataIfMaximumRetryCountIsReached?: ErrorData
  }
): GeneratorResponse<Data, ErrorData> {
  let timeoutPid: number | null = null
  let retryCount = 0
  const shouldRetryOnError = options?.shouldRetryOnError ?? true
  // If error interval is a number then store it here, use interval if not provided
  const errorInterval = typeof options?.errorInterval === 'number' ? options.errorInterval : interval
  const errorIntervalArray = Array.isArray(options?.errorInterval) ? options?.errorInterval ?? [] : []
  const delayStopFetching = options?.delayStopFetching ?? null
  const maximumRetryCount = options?.maximumRetryCount ?? null
  const displayThisErrorDataIfMaximumRetryCountIsReached =
    options?.displayThisErrorDataIfMaximumRetryCountIsReached

  const timeoutWrapper = async (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
  ): Promise<void> => {
    try {
      await fetchData(parameters, notifyObservers)
      retryCount = 0
    } catch (error) {
      if (shouldRetryOnError) {
        retryCount += 1
        if (maximumRetryCount !== null && retryCount >= maximumRetryCount) {
          if (displayThisErrorDataIfMaximumRetryCountIsReached !== undefined) {
            notifyObservers(null, displayThisErrorDataIfMaximumRetryCountIsReached)
          } else {
            // This will do nothing, the date will stay the same the moment the error occured
            return
          }

          console.warn('Maximum retry count reached, components will not be updated anymore')
          console.warn(error)
          return
        }

        const trueInterval = errorIntervalArray[retryCount - 1] ?? errorInterval

        timeoutPid = window.setTimeout(() => {
          void timeoutWrapper(parameters, notifyObservers)
        }, trueInterval)

        return
      }
    }

    // If everything is successful, set the timeout again
    timeoutPid = window.setTimeout(() => {
      void timeoutWrapper(parameters, notifyObservers)
    }, interval)
  }

  // Implements stopFetching function for this hook
  const stopFetching = async (parameters: string): Promise<void> => {
    if (timeoutPid !== null) {
      window.clearTimeout(timeoutPid)
    }
  }

  // Uses generateHook to generate the hook
  return generateHook<Data, ErrorData>(timeoutWrapper, stopFetching, {
    cacheTTLInMilliseconds: delayStopFetching ?? undefined
  })
}
