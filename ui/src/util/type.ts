import { ChangeEvent } from 'react'
import { AppDispatch, RootState } from '../store'
import { RemoteInterface } from './state'

export type JsonValue =
    | string
    | number
    | boolean
    | { [x: string]: JsonValue }
    | Array<JsonValue>
    | undefined

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SetFieldValue = (field: string, value: any, sholdValidate?: boolean) => void

export type HandleChange = {
    (e: ChangeEvent<HTMLInputElement>): void
    <T = string | ChangeEvent>(field: T): T extends ChangeEvent
        ? void
        : (e: string | ChangeEvent) => void
}

export type StringFunction = (str: string) => void

export type Fetch = (
    input: RequestInfo | URL,
    init?: RequestInit | undefined
) => Promise<Response>

export type ThunkWithFetch<T> = (
    dispatch: AppDispatch,
    getState: () => RootState,
    fetch: Fetch
) => Promise<T>

export interface IndexedList<U> {
    list: U[]
    indexMap: { [id: string]: number }
}

export function remoteIdPersistentKey<U extends { idPersistent: string }>(
    item: RemoteInterface<U >
) {
    return item.value.idPersistent
}

export function newIndexedListByKey<U>(
    list: U[],
    selector: (item: U) => string
): IndexedList<U> {
    return {
        list,
        indexMap: Object.fromEntries(list.map((item, idx) => [selector(item), idx]))
    }
}
