// Observer function, used to call every observer when the data changes
export type ObserverFunction<Data, ErrorData> = (data: Data | null, errorData: ErrorData | null) => void

export type ObserverFunctionReducer<Data, ErrorData, ReducedData, ReducedErrorData> =
    (data: Data | null, errorData: ErrorData | null) => { data: ReducedData | null, errorData: ReducedErrorData | null }
