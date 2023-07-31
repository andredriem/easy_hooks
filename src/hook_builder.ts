import { useId, useEffect, useState } from 'react'

abstract class Subscriber<Data, ErrorData> {
  parameters: string = ''

  constructor (parameters: string) {
    this.parameters = parameters
  }

  abstract fetchData (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
  ): Promise<void>
  abstract stopFetching (parameters: string): Promise<void>

  observersFunctions = new Map<string, (data: Data | null, errorData: ErrorData | null) => void>()

  subscribe (
    componentId: string,
    callback: (data: Data | null, errorData: ErrorData | null) => void
  ): void {
    this.observersFunctions.set(componentId, callback)

    if (Object.entries(this.observersFunctions).length === 1) {
      void this.fetchData(componentId, this.notifyObservers)
    }
  }

  unsubscribe (componentId: string): void {
    this.observersFunctions.delete(componentId)

    if (this.observersFunctions.size === 0) {
      void this.stopFetching(componentId)
    }
  }

  notifyObservers (data: Data | null, errorData: ErrorData | null): void {
    for (const observerFunction of this.observersFunctions.values()) {
      observerFunction(data, errorData)
    }
  }
}

/**
 * Generic Hook that fetches data from and subsciber class and manages the current state of the
 * component based on the incoming data
 * @param parameter unique id for the data you are fetching
 * @param subscriberPool pool of subscribers for this hook
 * @param SubcriberClass class that implements the subscriber (the one that is in the pool)
 * @returns [data, error, componentId] Based on your notification function in the subscriber you will receive
 * the data and error in the hook.
 */
function useGeneric<Data, ErrorData> (
  parameter: string,
  subscriberPool: Record<string, Subscriber<Data, ErrorData> | undefined>,
  SubcriberClass: new (parameters: string) => Subscriber<Data, ErrorData>
): [data: Data | null, error: ErrorData | null, componentId: string] {
  const componentId = useId()
  const [genericData, setGenericData] = useState<Data | null>(null)
  const [errorResponse, setErrorResponse] = useState<ErrorData | null>(null)

  useEffect(() => {
    let mounted = true

    // Check if subscriber is parameters is already created
    let subscriber = subscriberPool[parameter]
    if (subscriber === undefined) {
      subscriber = new SubcriberClass(parameter)
      subscriberPool[parameter] = subscriber
    }

    if (!Object.hasOwn(subscriber.observersFunctions, parameter)) {
      subscriber.subscribe(componentId, (data: Data | null, errorData: ErrorData | null) => {
        if (!mounted) {
          return
        }

        setGenericData(data)
        setErrorResponse(errorData)
      })
    }

    return function cleanup () {
      subscriber?.unsubscribe(componentId)
      mounted = false
    }
  }, [componentId, parameter, subscriberPool, SubcriberClass])

  return [genericData, errorResponse, componentId]
}

/**
 * Function to implement a hook in the most generic way possible, you need to implement the
 * fetchData and stopFetching functions. This hook will manage the state of the component based
 * on the callbacks implemented in the fetchData function, and must stop fetching when the
 * stopFetching function is called.
 * @param fetchData This function must fetch the data and call the notifyObservers function.
 * parameters is the unique id for the data you are fetching, and notifyObservers is a function
 * that you must call with the data and/or errorData you want to send to the component.
 * @param stopFetching This will be called when the last componnent using the generated hook parameter
 * is unmounted, you must stop fetching the data in this function.
 * @returns The generated hook
 */
export function generateHook<Data, ErrorData> (
  fetchData: (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void) => Promise<void>,
  stopFetching: (parameters: string) => Promise<void>
): (parameters: string) => [data: Data | null, error: ErrorData | null, componentId: string] {
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

  const subscriberPool: Record<string, HookSubscriber | undefined> = {}

  // Return hook function ommiting subscriber
  return (parameters: string) => {
    return useGeneric<Data, ErrorData>(parameters, subscriberPool, HookSubscriber)
  }
}

/**
 * This generators simplifies the implementation of a hook that fetches data periodically, you
 * need to implement the fetchData function that will be called periodically and the interval.
 * Remember that fetchData is an async function, so you can use await inside it while the data
 * is being fetched. The fetchData function must call the notifyObservers function with the data
 * and/or errorData you want to send to the component.
 * The fetchData function wil stop being called when the last component using the generated hook
 * parameter is unmounted.
 * @param fetchData This function must fetch the data and call the notifyObservers function.
 * @param interval Interval in milliseconds between each fetchData call.
 * @returns The generated hook
 */
export function generatePeriodicHook<Data, ErrorData> (
  fetchData: (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void) => Promise<void>,
  interval: number
): (parameters: string) => [data: Data | null, error: ErrorData | null, componentId: string] {
  // Implements subscriber class for this hook
  class HookSubscriber extends Subscriber<Data, ErrorData> {
    poolingPid: number | undefined = undefined

    async trueFetchData (
      parameters: string,
      notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
    ): Promise<void> {
      this.poolingPid = setTimeout(async () => {
        await fetchData(parameters, notifyObservers)
      }, interval)
    }

    async fetchData (
      parameters: string,
      notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
    ): Promise<void> {
      await this.trueFetchData(parameters, notifyObservers)
    }

    async stopFetching (parameters: string): Promise<void> {
      if (this.poolingPid !== undefined) { clearTimeout(this.poolingPid) }
    }
  }

  const subscriberPool: Record<string, HookSubscriber | undefined> = {}

  // Return hook function ommiting subscriber
  return (parameters: string) => {
    return useGeneric<Data, ErrorData>(parameters, subscriberPool, HookSubscriber)
  }
}

/**
 * This functiojn generates a hook that fetches data from a rails actioncable channel, you need
 * to implement the dataParser function that will parse the data received from the channel and
 * return the data and/or errorData you want to send to the component.
 * Remember that ActionCable is not included in this library, you need to include it in your
 * project before using this hook or make sure the actioncable variable is defined before generating
 * the hook.
 * @param channelName Name of the channel you want to connect to.
 * @param dataParser Function that will parse the data received from the channel and return the
 * @returns The generated hook
 */
export function actionCableHook<Data, ErrorData> (
  channelName: string,
  dataParser: (data: unknown) => [data: Data | null, error: ErrorData | null]
): (parameters: string) => [data: Data | null, error: ErrorData | null, componentId: string] {
  const ActionCable = window.ActionCable

  if (ActionCable === undefined) {
    throw new Error(
      'ActionCable is not defined, please make sure your rails app is using actioncable or the ' +
      'actioncable variable is defined before using this hook\n' +
      'You can also install the ActionCable library from npm: npm install actioncable\n')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cable: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let subscription: any

  const fetchData = async (
    parameters: string,
    notifyObservers: (data: Data | null, errorData: ErrorData | null) => void
  ): Promise<void> => {
    cable = window.ActionCable.createConsumer()
    subscription = cable.subscriptions.create({ channel: channelName, id: parameters }, {
      received (data: unknown) {
        const [dataParsed, errorParsed] = dataParser(data)

        notifyObservers(dataParsed, errorParsed)
      },
      disconnected () {
        console.warn(`Disconnected from channel: ${channelName} with id: ${parameters}`)
      }
    })
  }

  const stopFetching = (): void => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (subscription) {
      cable.subscriptions.remove(subscription)
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (cable) {
      cable.disconnect()
    }
  }

  class HookSubscriber extends Subscriber<Data, ErrorData> {
    async fetchData (
      parameters: string,
      notifyObservers: (data: Data | null, errorData: ErrorData | null) => void): Promise<void> {
      await fetchData(parameters, notifyObservers)
    }

    async stopFetching (parameters: string): Promise<void> {
      stopFetching()
    }
  }

  const subscriberPool: Record<string, HookSubscriber | undefined> = {}

  // Return hook function ommiting subscriber
  return (parameters: string) => {
    return useGeneric<Data, ErrorData>(parameters, subscriberPool, HookSubscriber)
  }
}
