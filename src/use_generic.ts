import { useEffect, useId, useState } from 'react'
import { type NotifierConstructor } from './notifier'
import { type HookGeneratorOptions, type Subscriber } from './subscriber'

/**
 * This function implements a generic hook that can be used to implement any hook
 * generated by this library.
 */
export function useGeneric<Data, ErrorData, CompressedData, CompressedErrorData> (
  parameter: string,
  subscriberPool: Record<string, Subscriber<Data, ErrorData> | undefined>,
  SubcriberClass: new (parameters: string, options?: HookGeneratorOptions) => Subscriber<Data, ErrorData>,
  subscriberOptions: HookGeneratorOptions,
  NotifierClass: NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData>
): [data: CompressedData | null, error: CompressedErrorData | null, componentId: string] {
  const componentId = useId()

  // Tries to get the subscriber from the pool and retrieves the data and error from it if it exists
  const subscriber = subscriberPool[parameter]
  const initialState: { data: CompressedData | null, errorData: CompressedErrorData | null } =
     { data: null, errorData: null }
  if (subscriber !== undefined) {
    subscriber.registerNotifier<CompressedData, CompressedErrorData>(NotifierClass)
  }

  // We can optimize the useState function combine both CompressedData and ErrorData in one state, this wil reduce the
  // number of useState calls thus reducing the number of renders
  const [state, setState] =
        useState<{ data: CompressedData | null, errorData: CompressedErrorData | null }>({
          data: initialState.data,
          errorData: initialState.errorData
        })

  const genericData = state.data
  const errorResponse = state.errorData

  useEffect(() => {
    let mounted = true

    // Check if subscriber is parameters is already created
    let subscriber = subscriberPool[parameter]
    if (subscriber === undefined) {
      subscriber = new SubcriberClass(parameter, subscriberOptions)
      subscriberPool[parameter] = subscriber
      subscriber.registerNotifier<CompressedData, CompressedErrorData>(NotifierClass)
    }

    // I'm casting this as unknown because typescript is not able to infer the type of the notifier
    // since this libary uses too much metaprogramming
    const currentNotifier = subscriber.notifiers.get<CompressedData, CompressedErrorData>(
      NotifierClass
    )

    if (currentNotifier !== undefined && !currentNotifier.observerFunctionMap.has(componentId)) {
      currentNotifier.subscribe(componentId, (data, errorData) => {
        if (!mounted) {
          return
        }
        // Casting this variables because i know it's safe. Since typescript can't assert the types
        // due to heavy metaprograming
        setState({ data, errorData })
      }
      )
    }

    return function cleanup () {
      currentNotifier?.unsubscribe(componentId)
      mounted = false
    }
  }, [componentId, parameter, subscriberPool, SubcriberClass, NotifierClass, subscriberOptions])

  return [genericData, errorResponse, componentId]
}
