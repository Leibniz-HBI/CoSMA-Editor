import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    TagHierarchyNode,
    newTagSelectionState,
    TagSelectionState,
    TagDefinition,
    newTagHierarchyNode
} from './state'
import { newRemote, RemoteInterface } from '../util/state'

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
        loadTagHierarchyStart(
            state: TagSelectionState,
            action: PayloadAction<string | undefined>
        ) {
            if (action.payload === undefined) {
                state.isLoading = true
                return
            }
            const existing = state.tagDefinitionsByIdPersistent[action.payload]
            if (existing == undefined) {
                state.tagDefinitionsByIdPersistent[action.payload] =
                    newRemote(undefined)
            } else {
                existing.isLoading = true
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
            const selectionEntries = []
            for (const tagDef of action.payload.entries) {
                selectionEntries.push(
                    newTagHierarchyNode({
                        idTagDefinitionPersistent: tagDef.idPersistent,
                        name: tagDef.namePath.at(-1) ?? '',
                        isExpanded: action.payload.forceExpand
                    })
                )
                state.tagDefinitionsByIdPersistent[tagDef.idPersistent] =
                    newRemote(tagDef)
            }
            if (path.length == 0) {
                state.isLoading = false
                updateNodesFromExisting(state.navigationEntries, selectionEntries)
                state.navigationEntries = selectionEntries
            } else {
                const entry = pickTagHierarchyNode(state.navigationEntries, path)
                if (entry !== undefined) {
                    state.tagDefinitionsByIdPersistent[
                        entry.idTagDefinitionPersistent
                    ].isLoading = false
                    updateNodesFromExisting(entry.children, selectionEntries)
                    entry.children = selectionEntries
                }
            }
        },
        toggleExpansion(state: TagSelectionState, action: PayloadAction<number[]>) {
            const entry = pickTagHierarchyNode(state.navigationEntries, action.payload)
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
            const tagDefinition = action.payload.tagDefinition
            state.tagDefinitionsByIdPersistent[tagDefinition.idPersistent] =
                newRemote(tagDefinition)
            if (oldNamePath !== undefined) {
                // remove previous entry, if existing
                let entries: TagHierarchyNode[] | undefined = state.navigationEntries
                if (oldNamePath.length > 0) {
                    entries = pickTagHierarchyNodeByNamePath(
                        entries,
                        oldNamePath
                    )?.children
                }
                if (entries !== undefined) {
                    for (const idx in entries) {
                        if (
                            entries[idx].idTagDefinitionPersistent ==
                            tagDefinition.idPersistent
                        ) {
                            entries.splice(parseInt(idx), 1)
                            break
                        }
                    }
                }
            }
            const tagHierarchyNode = newTagHierarchyNode({
                idTagDefinitionPersistent: tagDefinition.idPersistent,
                name: tagDefinition.namePath[-1],
                children: []
            })
            if (parentNamePath.length == 0) {
                state.navigationEntries.push(tagHierarchyNode)
            } else {
                const parentEntry = pickTagHierarchyNodeByNamePath(
                    state.navigationEntries,
                    parentNamePath
                )
                parentEntry?.children.push(tagHierarchyNode)
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
                tagDefinition: TagDefinition
                idParentOldPersistent: string | undefined
            }>
        ) {
            const tagDefinitionsByIdPersistent = state.tagDefinitionsByIdPersistent
            if (tagDefinitionsByIdPersistent === undefined) {
                return
            }
            const tagDefinition = action.payload.tagDefinition
            let originHierarchyArray = state.navigationEntries
            let oldNamePathPrefixLength = 0
            if (action.payload.idParentOldPersistent !== undefined) {
                // get old parent information
                const oldParentNamePath =
                    state.tagDefinitionsByIdPersistent[
                        action.payload.idParentOldPersistent
                    ]?.value?.namePath
                if (oldParentNamePath === undefined) {
                    return
                }
                const oldParentHierarchyNode = pickTagHierarchyNodeByNamePath(
                    state.navigationEntries,
                    oldParentNamePath
                )
                if (oldParentHierarchyNode === undefined) {
                    return
                }
                originHierarchyArray = oldParentHierarchyNode.children
                oldNamePathPrefixLength = oldParentNamePath.length
            }
            const tagDefinitionHierarchyNode = pickTagHierarchyNodeByNamePath(
                originHierarchyArray,
                tagDefinition.namePath.slice(-1)
            )
            if (tagDefinitionHierarchyNode === undefined) {
                return
            }
            let namePath: string[] = []
            let destinationHierarchyArray: TagHierarchyNode[] | undefined =
                state.navigationEntries
            // get new parent information
            if (tagDefinition.idParentPersistent !== undefined) {
                const newParentNamePath =
                    state.tagDefinitionsByIdPersistent[tagDefinition.idParentPersistent]
                        .value?.namePath
                if (newParentNamePath === undefined) {
                    return
                }
                const newParentHierarchyNode = pickTagHierarchyNodeByNamePath(
                    state.navigationEntries,
                    newParentNamePath
                )
                destinationHierarchyArray = newParentHierarchyNode?.children
                namePath =
                    state.tagDefinitionsByIdPersistent[
                        newParentHierarchyNode?.idTagDefinitionPersistent ?? ''
                    ]?.value?.namePath ?? namePath
            }
            if (destinationHierarchyArray === undefined) {
                return
            }
            updateNamePaths(
                tagDefinitionHierarchyNode,
                tagDefinitionsByIdPersistent,
                oldNamePathPrefixLength,
                namePath
            )
            tagDefinitionsByIdPersistent[tagDefinition.idPersistent] =
                newRemote(tagDefinition)
            destinationHierarchyArray.push(tagDefinitionHierarchyNode)
            // remove hierarchy node from old parent's child array
            for (let idx = 0; idx < originHierarchyArray.length; idx++) {
                if (
                    originHierarchyArray[idx].idTagDefinitionPersistent ==
                    action.payload.tagDefinition.idPersistent
                ) {
                    originHierarchyArray.splice(idx, 1)
                    break
                }
            }
            if (
                state.editTagDefinition.value?.idPersistent ==
                action.payload.tagDefinition.idPersistent
            ) {
                state.editTagDefinition = newRemote(undefined)
            }
        }
    }
})

function pickTagHierarchyNode(
    entries: TagHierarchyNode[],
    path: number[]
): TagHierarchyNode | undefined {
    let ret = entries[path[0]]
    for (let idx = 1; idx < path.length; ++idx) {
        ret = ret?.children[path[idx]]
    }
    return ret
}

function pickTagHierarchyNodeByNamePath(
    entries: TagHierarchyNode[],
    namePath: string[]
) {
    let entriesTmp = entries
    let parent = undefined
    for (const name of namePath) {
        for (const idx in entriesTmp) {
            if (entriesTmp[idx].name == name) {
                parent = entriesTmp[idx]
                entriesTmp = parent.children
                break
            }
        }
    }
    return parent
}

function updateNamePaths(
    rootEntry: TagHierarchyNode,
    tagDefinitions: { [key: string]: RemoteInterface<TagDefinition | undefined> },
    oldPrefixLength: number,
    newPrefix: string[]
) {
    const queue = [rootEntry]
    //eslint-disable-next-line no-constant-condition
    while (true) {
        const entry = queue.pop()
        if (entry === undefined) {
            break
        }
        queue.push(...entry.children)
        const tagDefinition = tagDefinitions[entry.idTagDefinitionPersistent].value
        if (tagDefinition !== undefined) {
            tagDefinition.namePath.splice(0, oldPrefixLength, ...newPrefix)
        }
    }
}

function updateNodesFromExisting(
    existingNodes: TagHierarchyNode[],
    newNodes: TagHierarchyNode[]
) {
    const existingIndices = Object.fromEntries(
        existingNodes.map((node, idx) => [node.idTagDefinitionPersistent, idx])
    )
    for (const node of newNodes) {
        const existingIdx = existingIndices[node.idTagDefinitionPersistent]
        if (existingIdx !== undefined) {
            node.isExpanded = existingNodes[existingIdx].isExpanded
        }
    }
}

export const {
    loadTagHierarchyError,
    loadTagHierarchyStart,
    loadTagHierarchySuccess,
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
