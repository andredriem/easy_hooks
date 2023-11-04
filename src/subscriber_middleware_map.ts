import { type SubscriberMiddleware, type SubscriberMiddlewareConstructor } from './subscriber_middleware'

/**
 * SubscriberMiddlewareMap is a Map that holds SubscriberMiddleware instances. It does some clever casting to assure that the
 * SubscriberMiddleware instances are of the correct type.
 * This class is here mainly to avoid casting in the other parts of the code.
 */
export class SubscriberMiddlewareMap<Data, ErrorData> {
  private readonly map = new Map<
  SubscriberMiddlewareConstructor<Data, ErrorData, unknown, unknown>,
  SubscriberMiddleware<Data, ErrorData, unknown, unknown>
  >()

  get<CompressedData, CompressedErrorData>(
    key: SubscriberMiddlewareConstructor<Data, ErrorData, CompressedData, CompressedErrorData>
  ): SubscriberMiddleware<Data, ErrorData, CompressedData, CompressedErrorData> | undefined {
    const value = this.map.get(key as SubscriberMiddlewareConstructor<Data, ErrorData, unknown, unknown>)
    return value as SubscriberMiddleware<Data, ErrorData, CompressedData, CompressedErrorData> | undefined
  }

  set<CompressedData, CompressedErrorData>(
    key: SubscriberMiddlewareConstructor<Data, ErrorData, CompressedData, CompressedErrorData>,
    value: SubscriberMiddleware<Data, ErrorData, CompressedData, CompressedErrorData>
  ): this {
    this.map.set(
      key as SubscriberMiddlewareConstructor<Data, ErrorData, unknown, unknown>,
      value as SubscriberMiddleware<Data, ErrorData, unknown, unknown>
    )
    return this
  }

  delete<CompressedData, CompressedErrorData>(
    key: SubscriberMiddlewareConstructor<Data, ErrorData, CompressedData, CompressedErrorData>
  ): boolean {
    return this.map.delete(key as SubscriberMiddlewareConstructor<Data, ErrorData, unknown, unknown>)
  }

  size (): number {
    return this.map.size
  }

  has<CompressedData, CompressedErrorData>(
    key: SubscriberMiddlewareConstructor<Data, ErrorData, CompressedData, CompressedErrorData>
  ): boolean {
    return this.map.has(key as SubscriberMiddlewareConstructor<Data, ErrorData, unknown, unknown>)
  }

  values (): IterableIterator<SubscriberMiddleware<Data, ErrorData, unknown, unknown>> {
    return this.map.values()
  }
}
