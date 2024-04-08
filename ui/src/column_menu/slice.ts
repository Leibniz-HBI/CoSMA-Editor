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
        submitTagDefinitionSuccess(
            state: TagSelectionState,
            action: PayloadAction<{
                tagDefinition: TagDefinition
                parentNamePath: string[]
                namePath?: string[]
            }>
        ) {
            state.isSubmittingDefinition = false
            const parentNamePath = action.payload.parentNamePath
            const oldNamePath = action.payload.namePath
            if (oldNamePath !== undefined) {
                // remove previous entry, if existing
                let entries: TagSelectionEntry[] | undefined = state.navigationEntries
                if (oldNamePath.length > 0) {
                    entries = pickTagSelectionEntryByNamePath(
                        entries,
                        oldNamePath
                    )?.children
                }
                if (entries !== undefined) {
                    for (const idx in entries) {
                        if (
                            entries[idx].columnDefinition.idPersistent ==
                            action.payload.tagDefinition.idPersistent
                        ) {
                            entries.splice(parseInt(idx), 1)
                        }
                    }
                }
            }
            const tagSelectionEntry = newTagSelectionEntry({
                columnDefinition: action.payload.tagDefinition,
                children: []
            })
            if (parentNamePath.length == 0) {
                state.navigationEntries.push(tagSelectionEntry)
            } else {
                const parentEntry = pickTagSelectionEntryByNamePath(
                    state.navigationEntries,
                    parentNamePath
                )
                parentEntry?.children.push(tagSelectionEntry)
            }
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
        dragTagDefinitionStart(state: TagSelectionState) {
            state.isDragging = true
        },
        dragTagDefinitionEnd(state: TagSelectionState) {
            state.isDragging = false
        },
        changeParentSuccess(
            state: TagSelectionState,
            action: PayloadAction<{
                tagSelectionEntry: TagSelectionEntry
                oldPath: number[]
                newPath: number[]
            }>
        ) {
            const tagSelectionEntry = action.payload.tagSelectionEntry
            const oldParentPath = action.payload.oldPath.slice(0, -1)
            let targetArray: TagSelectionEntry[] | undefined = state.navigationEntries
            let namePath: string[] = []
            if (action.payload.newPath.length > 0) {
                const newParent = pickTagSelectionEntry(
                    state.navigationEntries,
                    action.payload.newPath
                )
                targetArray = newParent?.children
                namePath = newParent?.columnDefinition.namePath ?? namePath
            }
            if (targetArray !== undefined) {
                updateNamePaths(tagSelectionEntry, oldParentPath.length, namePath)
                targetArray.push(tagSelectionEntry)
            }

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

function pickTagSelectionEntryByNamePath(
    entries: TagSelectionEntry[],
    namePath: string[]
) {
    let entriesTmp = entries
    let parent = undefined
    for (const name of namePath) {
        for (const idx in entriesTmp) {
            if (entriesTmp[idx].columnDefinition.namePath.at(-1) == name) {
                parent = entriesTmp[idx]
                entriesTmp = parent.children
                break
            }
        }
    }
    return parent
}

function updateNamePaths(
    rootEntry: TagSelectionEntry,
    oldPrefixLength: number,
    newPrefix: string[]
) {
    const queue = [rootEntry]
    //eslint-disable-next-line no-constant-condition
    while (true) {
        const entry = queue.pop()
        if (entry == undefined) {
            break
        }
        queue.push(...entry.children)
        entry.columnDefinition.namePath.splice(0, oldPrefixLength, ...newPrefix)
    }
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
    changeParentSuccess,
    dragTagDefinitionStart,
    dragTagDefinitionEnd
} = tagSelectionSlice.actions
