import { ErrorState } from '../util/error'
import { ColumnSelectionEntry } from './state'

/**Indicates that loading has started */
export class StartLoadingAction {
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
export class SetNavigationEntriesAction {
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
 * Enum for different tabs
 */
export enum ColumnMenuTab {
    SHOW,
    CREATE_NEW
}
/**
 * Indicate the tab to be shown
 */

export class SelectTabAction {
    selectedTab: ColumnMenuTab

    constructor(selectedTab: ColumnMenuTab) {
        this.selectedTab = selectedTab
    }
}

/**
 * Indicate the start of a column definition submission
 */
export class SubmitColumnDefinitionStartAction {}

/**
 * Indicte that a column definition was successfully submitted
 */
export class SubmitColumnDefinitionSuccessAction {}

/**
 * Indicate that an error occured during column definition submission.
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
 * Indicates that an error occured
 */
export class SetErrorAction {
    errorState: ErrorState
    constructor(errorState: ErrorState) {
        this.errorState = errorState
    }
}
export type ColumnSelectionAction =
    | StartLoadingAction
    | StartSearchAction
    | SetNavigationEntriesAction
    | SetSearchEntriesAction
    | ClearSearchEntriesAction
    | ToggleExpansionAction
    | SelectTabAction
    | SubmitColumnDefinitionStartAction
    | SubmitColumnDefinitionSuccessAction
    | SubmitColumnDefinitionErrorAction
    | SubmitColumnDefinitionClearErrorAction
    | SetErrorAction

/**
 * Indicates that expansion of an entry should be toggled
 */
export class ToggleExpansionAction {
    path: number[]
    constructor(path: number[]) {
        this.path = path
    }
}
