import { ErrorState } from '../util/error'
import { ColumnSelectionEntry } from './state'

/**Indicates that loading has started */
export class LoadColumnHierarchyStartAction {
    path: number[]
    constructor(path: number[]) {
        this.path = path
    }
}
/**Indicates that search has started */
export class StartSearchAction {}

/**
 * Indicates successful return of navigation entries
 */
export class LoadColumnHierarchySuccessAction {
    entries: ColumnSelectionEntry[]
    path: number[]
    constructor(entries: ColumnSelectionEntry[], path: number[]) {
        this.entries = entries
        this.path = path
    }
}
/**
 * Indicates successful return of entries from search
 */
export class SetSearchEntriesAction {
    entries: ColumnSelectionEntry[]
    constructor(entries: ColumnSelectionEntry[]) {
        this.entries = entries
    }
}

/**
 * Indicates that search entries should be cleared
 */
export class ClearSearchEntriesAction {}

/**
 * Indicate the start of a column definition submission
 */
export class SubmitColumnDefinitionStartAction {}

/**
 * Indicate that a column definition was successfully submitted
 */
export class SubmitColumnDefinitionSuccessAction {}

/**
 * Indicate that an error occurred during column definition submission.
 */
export class SubmitColumnDefinitionErrorAction {
    msg: string
    retryCallback?: VoidFunction

    constructor({
        msg,
        retryCallback = undefined
    }: {
        msg: string
        retryCallback?: VoidFunction
    }) {
        this.msg = msg
        this.retryCallback = retryCallback
    }
}

/**
 * Indicates that the column definition submission error should be cleared
 */
export class SubmitColumnDefinitionClearErrorAction {}

/**
 * Indicates that an error occurred
 */
export class LoadColumnHierarchyErrorAction {
    errorState: ErrorState
    constructor(errorState: ErrorState) {
        this.errorState = errorState
    }
}
export type ColumnSelectionAction =
    | LoadColumnHierarchyErrorAction
    | LoadColumnHierarchyStartAction
    | LoadColumnHierarchySuccessAction
    | StartSearchAction
    | SetSearchEntriesAction
    | ClearSearchEntriesAction
    | ToggleExpansionAction
    | SubmitColumnDefinitionStartAction
    | SubmitColumnDefinitionSuccessAction
    | SubmitColumnDefinitionErrorAction
    | SubmitColumnDefinitionClearErrorAction

/**
 * Indicates that expansion of an entry should be toggled
 */
export class ToggleExpansionAction {
    path: number[]
    rootGroup?: string
    constructor(path: number[], rootGroup?: string) {
        this.path = path
        this.rootGroup = rootGroup
    }
}
