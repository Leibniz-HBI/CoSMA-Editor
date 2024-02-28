import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    TagSelectionEntry,
    newTagSelectionState,
    TagSelectionState,
    TagDefinition,
    newTagSelectionEntry
} from './state'
import { newRemote } from '../util/state'

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
            action: PayloadAction<{
                entries: TagDefinition[]
                path: number[]
                forceExpand: boolean
            }>
        ) {
            const path = action.payload.path
            const selectionEntries = action.payload.entries.map((tagDef) =>
                newTagSelectionEntry({
                    columnDefinition: tagDef,
                    isExpanded: action.payload.forceExpand
                })
            )
            //TODO use existing expanded state. Possibly use tag definition instead of tag selection entry!
            if (path.length == 0) {
                state.isLoading = false
                state.navigationEntries = selectionEntries
            } else {
                const entry = pickTagSelectionEntry(state.navigationEntries, path)
                if (entry !== undefined) {
                    entry.children = selectionEntries
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
        },
        setEditTagDefinition(
            state: TagSelectionState,
            action: PayloadAction<TagDefinition>
        ) {
            state.editTagDefinition.value = action.payload
        },
        clearEditTagDefinition(state: TagSelectionState) {
            state.editTagDefinition.value = undefined
        },
        editTagDefinitionStart(
            state: TagSelectionState,
            action: PayloadAction<string>
        ) {
            if (state.editTagDefinition.value?.idPersistent == action.payload) {
                state.editTagDefinition.isLoading = true
            }
        },
        editTagDefinitionError(
            state: TagSelectionState,
            action: PayloadAction<string>
        ) {
            if (state.editTagDefinition.value?.idPersistent == action.payload) {
                state.editTagDefinition.isLoading = false
            }
        },
        changeParentSuccess(
            state: TagSelectionState,
            action: PayloadAction<{
                tagSelectionEntry: TagSelectionEntry
                oldPath: number[]
                newPath: number[]
            }>
        ) {
            const newParent = pickTagSelectionEntry(
                state.navigationEntries,
                action.payload.newPath
            )
            if (newParent !== undefined) {
                const tagSelectionEntry = action.payload.tagSelectionEntry
                newParent.children.push({
                    ...tagSelectionEntry,
                    columnDefinition: {
                        ...tagSelectionEntry.columnDefinition,
                        namePath: [
                            ...newParent.columnDefinition.namePath,
                            tagSelectionEntry.columnDefinition.namePath.at(-1) ?? ''
                        ]
                    }
                })
            }
            //TODO find old parent remove new
            const oldParentPath = action.payload.oldPath.slice(0, -1)
            let childList = state.navigationEntries
            if (oldParentPath.length > 0) {
                const oldParent = pickTagSelectionEntry(
                    state.navigationEntries,
                    oldParentPath
                )
                if (oldParent !== undefined) {
                    childList = oldParent?.children
                }
            }
            let idx = 0
            for (; idx < childList.length; idx++) {
                if (
                    childList[idx].columnDefinition.idPersistent ==
                    action.payload.tagSelectionEntry.columnDefinition.idPersistent
                ) {
                    break
                }
            }
            childList.splice(idx, 1)
            if (
                state.editTagDefinition.value?.idPersistent ==
                action.payload.tagSelectionEntry.columnDefinition.idPersistent
            ) {
                state.editTagDefinition = newRemote(undefined)
            }
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
    toggleExpansion,
    setEditTagDefinition,
    clearEditTagDefinition,
    editTagDefinitionStart,
    editTagDefinitionError,
    changeParentSuccess
} = tagSelectionSlice.actions
