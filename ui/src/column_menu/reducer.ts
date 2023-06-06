import { ErrorState } from '../util/error'
import {
    ClearSearchEntriesAction,
    ColumnSelectionAction,
    LoadColumnHierarchyErrorAction,
    LoadColumnHierarchySuccessAction,
    SetSearchEntriesAction,
    LoadColumnHierarchyStartAction,
    StartSearchAction,
    ToggleExpansionAction,
    SubmitColumnDefinitionStartAction,
    SubmitColumnDefinitionSuccessAction,
    SubmitColumnDefinitionErrorAction,
    SubmitColumnDefinitionClearErrorAction
} from './actions'
import { ColumnSelectionEntry, ColumnSelectionState } from './state'

export function columnMenuReducer(
    state: ColumnSelectionState,
    action: ColumnSelectionAction
) {
    if (action instanceof LoadColumnHierarchyErrorAction) {
        return new ColumnSelectionState({ errorState: action.errorState })
    } else if (action instanceof StartSearchAction) {
        return new ColumnSelectionState({ ...state, isSearching: true })
    } else if (action instanceof SetSearchEntriesAction) {
        return new ColumnSelectionState({
            ...state,
            isSearching: false,
            searchEntries: action.entries
        })
    } else if (action instanceof ClearSearchEntriesAction) {
        return new ColumnSelectionState({
            ...state,
            searchEntries: []
        })
    } else if (action instanceof LoadColumnHierarchySuccessAction) {
        if (action.path.length == 0) {
            return new ColumnSelectionState({
                ...state,
                isLoading: false,
                navigationEntries: action.entries
            })
        }
        return new ColumnSelectionState({
            ...state,
            navigationEntries: [
                ...state.navigationEntries.slice(0, action.path[0]),
                columnSelectionEntryReducer(
                    state.navigationEntries[action.path[0]],
                    action,
                    action.path.slice(1)
                ),
                ...state.navigationEntries.slice(action.path[0] + 1)
            ]
        })
    } else if (action instanceof LoadColumnHierarchyStartAction) {
        if (action.path.length == 0) {
            return new ColumnSelectionState({
                ...state,
                isLoading: true,
                errorState: undefined
            })
        }
        return new ColumnSelectionState({
            ...state,
            navigationEntries: [
                ...state.navigationEntries.slice(0, action.path[0]),
                columnSelectionEntryReducer(
                    state.navigationEntries[action.path[0]],
                    action,
                    action.path.slice(1)
                ),
                ...state.navigationEntries.slice(action.path[0] + 1)
            ]
        })
    } else if (action instanceof ToggleExpansionAction) {
        return new ColumnSelectionState({
            ...state,
            navigationEntries: [
                ...state.navigationEntries.slice(0, action.path[0]),
                columnSelectionEntryReducer(
                    state.navigationEntries[action.path[0]],
                    action,
                    action.path.slice(1)
                ),
                ...state.navigationEntries.slice(action.path[0] + 1)
            ]
        })
    } else if (action instanceof SubmitColumnDefinitionStartAction) {
        return new ColumnSelectionState({
            ...state,
            isSubmittingDefinition: true,
            submissionErrorState: undefined
        })
    } else if (action instanceof SubmitColumnDefinitionSuccessAction) {
        return new ColumnSelectionState({ ...state, isSubmittingDefinition: false })
    } else if (action instanceof SubmitColumnDefinitionErrorAction) {
        return new ColumnSelectionState({
            ...state,
            isSubmittingDefinition: false,
            submissionErrorState: new ErrorState(action.msg, action.retryCallback)
        })
    } else if (action instanceof SubmitColumnDefinitionClearErrorAction) {
        return new ColumnSelectionState({ ...state, submissionErrorState: undefined })
    }
    return state
}

export function columnSelectionEntryReducer(
    state: ColumnSelectionEntry,
    action: ColumnSelectionAction,
    path: number[]
): ColumnSelectionEntry {
    if (path.length > 0) {
        // mismatch between path and state.
        if (state === undefined) {
            return state
        }
        return new ColumnSelectionEntry({
            ...state,
            children: [
                ...state.children.slice(0, path[0]),
                columnSelectionEntryReducer(
                    state.children[path[0]],
                    action,
                    path.slice(1)
                ),
                ...state.children.slice(path[0] + 1)
            ]
        })
    }
    if (action instanceof ToggleExpansionAction) {
        return new ColumnSelectionEntry({
            ...state,
            isExpanded: !state.isExpanded
        })
    } else if (action instanceof LoadColumnHierarchySuccessAction) {
        return new ColumnSelectionEntry({
            ...state,
            children: action.entries,
            isLoading: false
        })
    } else if (action instanceof LoadColumnHierarchyStartAction) {
        return new ColumnSelectionEntry({
            ...state,
            isLoading: true
        })
    }
    return state
}
