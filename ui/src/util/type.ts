import { ChangeEvent } from 'react'

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
