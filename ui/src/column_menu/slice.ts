import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { TagSelectionEntry, newTagSelectionState, TagSelectionState } from './state'

const initialState = newTagSelectionState({})

export const tagSelectionSlice = createSlice({
    name: 'tagSelection',
    initialState,
    reducers: {
        loadTagHierarchyError(state: TagSelectionState) {
            state.isLoading = false
        },
        startSearch(state: TagSelectionState) {
            state.isSearching = true
        },
        setSearchEntries(
            state: TagSelectionState,
            action: PayloadAction<TagSelectionEntry[]>
        ) {
            state.isSearching = false
            state.searchEntries = action.payload
        },
        clearSearchEntries(state: TagSelectionState) {
            state.searchEntries = []
        },
        loadTagHierarchyStart(
            state: TagSelectionState,
            action: PayloadAction<number[]>
        ) {
            const path = action.payload
            if (path.length == 0) {
                state.isLoading = true
            } else {
                const entry = pickTagSelectionEntry(
                    state.navigationEntries,
                    action.payload
                )
                if (entry !== undefined) {
                    entry.isLoading = true
                }
            }
        },
        loadTagHierarchySuccess(
            state: TagSelectionState,
            action: PayloadAction<{ entries: TagSelectionEntry[]; path: number[] }>
        ) {
            const path = action.payload.path
            if (path.length == 0) {
                state.isLoading = false
                state.navigationEntries = action.payload.entries
            } else {
                const entry = pickTagSelectionEntry(state.navigationEntries, path)
                if (entry !== undefined) {
                    entry.children = action.payload.entries
                    entry.isLoading = false
                }
            }
        },
        toggleExpansion(state: TagSelectionState, action: PayloadAction<number[]>) {
            const entry = pickTagSelectionEntry(state.navigationEntries, action.payload)
            if (entry !== undefined) {
                entry.isExpanded = !entry.isExpanded
            }
        },
        submitTagDefinitionStart(state: TagSelectionState) {
            state.isSubmittingDefinition = true
        },
        submitTagDefinitionSuccess(state: TagSelectionState) {
            state.isSubmittingDefinition = false
        },
        submitTagDefinitionError(state: TagSelectionState) {
            state.isSubmittingDefinition = false
        }
    }
})

function pickTagSelectionEntry(
    entries: TagSelectionEntry[],
    path: number[]
): TagSelectionEntry | undefined {
    let ret = entries[path[0]]
    for (let idx = 1; idx < path.length; ++idx) {
        ret = ret?.children[path[idx]]
    }
    return ret
}

export const {
    clearSearchEntries,
    loadTagHierarchyError,
    loadTagHierarchyStart,
    loadTagHierarchySuccess,
    setSearchEntries,
    startSearch,
    submitTagDefinitionError,
    submitTagDefinitionStart,
    submitTagDefinitionSuccess,
    toggleExpansion
} = tagSelectionSlice.actions
