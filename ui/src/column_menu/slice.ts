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
                updateNodesFromExisting(state.children, selectionEntries)
                state.children = selectionEntries
            } else {
                const entry = pickTagHierarchyNode(state.children, path)
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
            const entry = pickTagHierarchyNode(state.children, action.payload)
            if (entry !== undefined) {
                entry.isExpanded = !entry.isExpanded
            }
        },
        curateTagDefinitionStart(_state: TagSelectionState) {
            return
        },
        curateTagDefinitionError(_state: TagSelectionState) {
            return
        },
        curateTagDefinitionSuccess(
            state: TagSelectionState,
            action: PayloadAction<string>
        ) {
            const tagDefinition = state.tagDefinitionsByIdPersistent[action.payload]
            if (!(tagDefinition === undefined || tagDefinition.value === undefined)) {
                tagDefinition.value.curated = true
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
            if (tagDefinition.disabled) {
                delete state.tagDefinitionsByIdPersistent[tagDefinition.idPersistent]
                let parent: { children: TagHierarchyNode[] } | undefined = state
                if (parentNamePath.length > 0) {
                    parent = pickTagHierarchyNodeByNamePath(
                        parent.children,
                        parentNamePath
                    )
                }
                if (parent !== undefined) {
                    for (let idx = 0; idx < parent.children.length; idx++) {
                        if (
                            parent.children[idx].idTagDefinitionPersistent ==
                            tagDefinition.idPersistent
                        ) {
                            parent.children.splice(
                                idx,
                                1,
                                ...parent.children[idx].children
                            )

                            return
                        }
                    }
                }
                return
            }
            if (oldNamePath !== undefined) {
                // remove previous entry, if existing
                let entries: TagHierarchyNode[] | undefined = state.children
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
                state.children.push(tagHierarchyNode)
            } else {
                const parentEntry = pickTagHierarchyNodeByNamePath(
                    state.children,
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
        getTagDefinitionDetailsError(
            state: TagSelectionState,
            action: PayloadAction<string[]>
        ) {
            for (const idPersistent of action.payload) {
                const remoteTagDefinition =
                    state.tagDefinitionsByIdPersistent[idPersistent]
                if (remoteTagDefinition === undefined) {
                    state.tagDefinitionsByIdPersistent[idPersistent] = newRemote(
                        undefined,
                        false
                    )
                } else {
                    remoteTagDefinition.isLoading = false
                }
            }
        },
        getTagDefinitionDetailsStart(
            state: TagSelectionState,
            action: PayloadAction<string[]>
        ) {
            for (const idPersistent of action.payload) {
                const remoteTagDefinition =
                    state.tagDefinitionsByIdPersistent[idPersistent]
                if (remoteTagDefinition === undefined) {
                    state.tagDefinitionsByIdPersistent[idPersistent] = newRemote(
                        undefined,
                        true
                    )
                } else {
                    remoteTagDefinition.isLoading = true
                }
            }
        },
        getTagDefinitionDetailsSuccess(
            state: TagSelectionState,
            action: PayloadAction<TagDefinition[]>
        ) {
            for (const tagDefinition of action.payload) {
                state.tagDefinitionsByIdPersistent[tagDefinition.idPersistent] =
                    newRemote(tagDefinition)
            }
        },
        changeParentSuccess(
            state: TagSelectionState,
            action: PayloadAction<{
                oldPathToTagDefinition: number[]
                pathToNewParent: number[]
                tagDefinition: TagDefinition
            }>
        ) {
            const tagDefinitionsByIdPersistent = state.tagDefinitionsByIdPersistent
            if (tagDefinitionsByIdPersistent === undefined) {
                throw Error('Tag definitions cache not populated.')
            }
            const tagDefinition = action.payload.tagDefinition
            const oldPathToTagDefinition = action.payload.oldPathToTagDefinition
            let originHierarchyArray = state.children
            let oldNamePathPrefixLength = 0
            if (oldPathToTagDefinition.length > 1) {
                // get old parent information
                const oldParentHierarchyNode = pickTagHierarchyNode(
                    state.children,
                    oldPathToTagDefinition.slice(0, -1)
                )
                if (oldParentHierarchyNode === undefined) {
                    throw Error('Could not find parent in tag hierarchy.')
                }
                originHierarchyArray = oldParentHierarchyNode.children
                oldNamePathPrefixLength = oldPathToTagDefinition.length - 1
            }
            const tagDefinitionHierarchyNode =
                originHierarchyArray[
                    oldPathToTagDefinition[oldPathToTagDefinition.length - 1]
                ]
            if (tagDefinitionHierarchyNode === undefined) {
                throw new Error('could not find tag hierarchy node')
            }
            let namePath: string[] = []
            let destinationHierarchyArray: TagHierarchyNode[] | undefined =
                state.children
            // get new parent information
            if (tagDefinition.idParentPersistent !== undefined) {
                const newParentHierarchyNode = pickTagHierarchyNode(
                    state.children,
                    action.payload.pathToNewParent
                )
                if (newParentHierarchyNode === undefined) {
                    throw Error('Could not find new parent in tag hierarchy')
                }
                destinationHierarchyArray = newParentHierarchyNode?.children
                namePath =
                    state.tagDefinitionsByIdPersistent[
                        newParentHierarchyNode?.idTagDefinitionPersistent ?? ''
                    ]?.value?.namePath ?? namePath
            }
            if (destinationHierarchyArray === undefined) {
                throw Error('Could not find destination array for moved tag.')
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
    dragTagDefinitionEnd,
    curateTagDefinitionError,
    curateTagDefinitionStart,
    curateTagDefinitionSuccess,
    getTagDefinitionDetailsError,
    getTagDefinitionDetailsStart,
    getTagDefinitionDetailsSuccess
} = tagSelectionSlice.actions
