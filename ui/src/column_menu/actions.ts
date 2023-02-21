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

export type ColumnSelectionAction =
    | StartLoadingAction
    | StartSearchAction
    | SetNavigationEntriesAction
    | SetSearchEntriesAction
    | ClearSearchEntriesAction
    | ToggleExpansionAction

/**
 * Indicates that expansion of an entry should be toggled
 */
export class ToggleExpansionAction {
    path: number[]
    constructor(path: number[]) {
        this.path = path
    }
}
