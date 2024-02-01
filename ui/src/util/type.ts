import { ChangeEvent } from 'react'
import { AppDispatch, RootState } from '../store'
import { Notification } from './notification/slice'

export type JsonValue =
    | string
    | number
    | boolean
    | { [x: string]: JsonValue }
    | Array<JsonValue>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SetFieldValue = (field: string, value: any, sholdValidate?: boolean) => void

export type HandleChange = {
    (e: ChangeEvent): void
    <T = string | ChangeEvent>(field: T): T extends ChangeEvent
        ? void
        : (e: string | ChangeEvent) => void
}

export type StringFunction = (str: string) => void

type Fetch = (
    input: RequestInfo | URL,
    init?: RequestInit | undefined
) => Promise<Response>

export type ThunkWithFetch<T> = (
    dispatch: AppDispatch,
    getState: () => RootState,
    fetch: Fetch
) => Promise<T>
