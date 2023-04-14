import { ChangeEvent } from 'react'

export type JsonValue =
    | string
    | number
    | boolean
    | { [x: string]: JsonValue }
    | Array<JsonValue>

export type HandleChange = {
    (e: ChangeEvent): void
    <T = string | ChangeEvent>(field: T): T extends ChangeEvent
        ? void
        : (e: string | ChangeEvent) => void
}
