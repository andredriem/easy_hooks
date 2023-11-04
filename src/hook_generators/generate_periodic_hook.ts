import { generateHook, type GeneratorResponse } from './generate_hook'

/**
 * Generates a periodic hook that fetches data at a specified interval.
 * @param fetchData Function that fetches data and notifies observers of the result.
 * @param interval Interval in milliseconds at which to fetch data.
 * @param options Optional configuration options for the hook.
 *  - shouldRetryOnError: Whether to retry fetching data if an error occurs (defaults to true).
 *  - errorInterval: Interval in milliseconds at which to retry fetching data if an error occurs.
 *    if it is an array, the interval will be the value at the index of the retry count, if the index is out of bounds
 *    the last value of the array will be used, if the array is empty the interval will be the same as the interval.
 *  - delayStopFetching: Delay in milliseconds before stopping fetching data after the last component unsubscribes,
 *    this is usefull to prevent the cache from expiring too soon if you expect some components with the same parameters
 *    to be mounted really soon after the last one unmounts.
 *  - maximumRetryCount: Maximum number of retries before stopping to retry fetching data. If this option is not set
 *    the hook will retry fetching data indefinitely.
 *  - displayThisErrorDataIfMaximumRetryCountIsReached: Error data to display if the maximum retry count is reached.
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
  // Store the timeout pid here to stop it if all components are unmounted
  let timeoutPid: number | null = null
  // Number of times the fetchData function has been called
  let retryCount = 0
  // If shouldRetryOnError is not provided, default to true
  const shouldRetryOnError = options?.shouldRetryOnError ?? true
  // If error interval is a number then store it here, use interval if not provided
  const errorInterval = typeof options?.errorInterval === 'number' ? options.errorInterval : interval
  // If error interval is an array then store it here, use empty array if not provided
  const errorIntervalArray = Array.isArray(options?.errorInterval) ? options?.errorInterval ?? [] : []
  const delayStopFetching = options?.delayStopFetching ?? null
  const maximumRetryCount = options?.maximumRetryCount ?? null
  const displayThisErrorDataIfMaximumRetryCountIsReached =
    options?.displayThisErrorDataIfMaximumRetryCountIsReached

  // Creates a wrapper function that will call the fetchData function and set the timeout again
  // when the fetchData function is done
  const timeoutWrapper = async (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
  ): Promise<void> => {
    try {
      await fetchData(parameters, notifyObservers)
      // if fetchData is successful, reset the retry count
      retryCount = 0
    } catch (error) {
      if (shouldRetryOnError) {
        retryCount += 1
        // If maximumRetryCount is reached, stop fetching data
        if (maximumRetryCount !== null && retryCount >= maximumRetryCount) {
          // Notify observers with the error data if it is provided
          if (displayThisErrorDataIfMaximumRetryCountIsReached !== undefined) {
            notifyObservers(null, displayThisErrorDataIfMaximumRetryCountIsReached)
          }

          return
        }

        // Fetch data again after the specified interval
        const trueInterval = errorIntervalArray[retryCount - 1] ?? errorInterval

        timeoutPid = window.setTimeout(() => {
          void timeoutWrapper(parameters, notifyObservers)
        }, trueInterval)

        return
      }

      // Since shouldRetryOnError is false, we will not retry fetching data
      return
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
