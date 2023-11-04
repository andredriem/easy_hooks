import { type Notifier, type NotifierConstructor } from './notifier'

/**
 * NotifierMap is a Map that holds Notifier instances. It does some clever casting to assure that the
 * Notifier instances are of the correct type.
 * This class is here mainly to avoid casting in the other parts of the code.
 * Since all the methods are simple wrappers around the Map methods, the JIT compiler should be able
 * to optimize them away and remove the bloated during runtime.
 */
export class NotifierMap<Data, ErrorData> {
  private readonly map = new Map<
  NotifierConstructor<Data, ErrorData, unknown, unknown>,
  Notifier<Data, ErrorData, unknown, unknown>
  >()

  get<CompressedData, CompressedErrorData>(
    key: NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData>
  ): Notifier<Data, ErrorData, CompressedData, CompressedErrorData> | undefined {
    const value = this.map.get(key as NotifierConstructor<Data, ErrorData, unknown, unknown>)
    return value as Notifier<Data, ErrorData, CompressedData, CompressedErrorData> | undefined
  }

  set<CompressedData, CompressedErrorData>(
    key: NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData>,
    value: Notifier<Data, ErrorData, CompressedData, CompressedErrorData>
  ): this {
    this.map.set(
      key as NotifierConstructor<Data, ErrorData, unknown, unknown>,
      value as Notifier<Data, ErrorData, unknown, unknown>
    )
    return this
  }

  delete<CompressedData, CompressedErrorData>(
    key: NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData>
  ): boolean {
    return this.map.delete(key as NotifierConstructor<Data, ErrorData, unknown, unknown>)
  }

  size (): number {
    return this.map.size
  }

  has<CompressedData, CompressedErrorData>(
    key: NotifierConstructor<Data, ErrorData, CompressedData, CompressedErrorData>
  ): boolean {
    return this.map.has(key as NotifierConstructor<Data, ErrorData, unknown, unknown>)
  }

  values (): IterableIterator<Notifier<Data, ErrorData, unknown, unknown>> {
    return this.map.values()
  }
}
