import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    ColumnIdHierarchyNode,
    newColumnSelectionState,
    ColumnSelectionState,
    Column,
    newColumnHierarchyNode
} from './state'
import { newRemote, RemoteInterface } from '../util/state'

const initialState = newColumnSelectionState({})

const columnSelectionSlice = createSlice({
    name: 'columnSelection',
    initialState,
    reducers: {
        loadColumnHierarchyError(state: ColumnSelectionState) {
            state.isLoading = false
        },
        startSearch(state: ColumnSelectionState) {
            state.isSearching = true
        },
        loadColumnHierarchyStart(
            state: ColumnSelectionState,
            action: PayloadAction<string | undefined>
        ) {
            if (action.payload === undefined) {
                state.isLoading = true
                return
            }
            const existing = state.columnsByIdPersistent[action.payload]
            if (existing == undefined) {
                state.columnsByIdPersistent[action.payload] =
                    newRemote(undefined)
            } else {
                existing.isLoading = true
            }
        },
        loadColumnHierarchySuccess(
            state: ColumnSelectionState,
            action: PayloadAction<{
                entries: Column[]
                path: number[]
                forceExpand: boolean
            }>
        ) {
            const path = action.payload.path
            const selectionEntries = []
            for (const column of action.payload.entries) {
                selectionEntries.push(
                    newColumnHierarchyNode({
                        idColumnPersistent: column.idPersistent,
                        name: column.namePath.at(-1) ?? '',
                        isExpanded: action.payload.forceExpand
                    })
                )
                state.columnsByIdPersistent[column.idPersistent] =
                    newRemote(column)
            }
            if (path.length == 0) {
                state.isLoading = false
                updateNodesFromExisting(state.children, selectionEntries)
                state.children = selectionEntries
            } else {
                const entry = pickColumnHierarchyNode(state.children, path)
                if (entry !== undefined) {
                    state.columnsByIdPersistent[
                        entry.idColumnPersistent
                    ].isLoading = false
                    updateNodesFromExisting(entry.children, selectionEntries)
                    entry.children = selectionEntries
                }
            }
        },
        toggleExpansion(state: ColumnSelectionState, action: PayloadAction<number[]>) {
            const entry = pickColumnHierarchyNode(state.children, action.payload)
            if (entry !== undefined) {
                entry.isExpanded = !entry.isExpanded
            }
        },
        curateColumnStart(_state: ColumnSelectionState) {
            return
        },
        curateColumnError(_state: ColumnSelectionState) {
            return
        },
        curateColumnSuccess(
            state: ColumnSelectionState,
            action: PayloadAction<string>
        ) {
            const column = state.columnsByIdPersistent[action.payload]
            if (!(column === undefined || column.value === undefined)) {
                column.value.curated = true
            }
        },
        submitColumnStart(state: ColumnSelectionState) {
            state.isSubmittingDefinition = true
        },
        submitColumnSuccess(
            state: ColumnSelectionState,
            action: PayloadAction<{
                column: Column
                parentNamePath: string[]
                namePath?: string[]
            }>
        ) {
            state.isSubmittingDefinition = false
            const parentNamePath = action.payload.parentNamePath
            const oldNamePath = action.payload.namePath
            const column= action.payload.column
            state.columnsByIdPersistent[column.idPersistent] =
                newRemote(column)
            if (column.disabled) {
                delete state.columnsByIdPersistent[column.idPersistent]
                let parent: { children: ColumnIdHierarchyNode[] } | undefined = state
                if (parentNamePath.length > 0) {
                    parent = pickColumnHierarchyNodeByNamePath(
                        parent.children,
                        parentNamePath
                    )
                }
                if (parent !== undefined) {
                    for (let idx = 0; idx < parent.children.length; idx++) {
                        if (
                            parent.children[idx].idColumnPersistent ==
                            column.idPersistent
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
                let entries: ColumnIdHierarchyNode[] | undefined = state.children
                if (oldNamePath.length > 0) {
                    entries = pickColumnHierarchyNodeByNamePath(
                        entries,
                        oldNamePath
                    )?.children
                }
                if (entries !== undefined) {
                    for (const idx in entries) {
                        if (
                            entries[idx].idColumnPersistent ==
                            column.idPersistent
                        ) {
                            entries.splice(parseInt(idx), 1)
                            break
                        }
                    }
                }
            }
            const columnHierarchyNode = newColumnHierarchyNode({
                idColumnPersistent: column.idPersistent,
                name: column.namePath[-1],
                children: []
            })
            if (parentNamePath.length == 0) {
                state.children.push(columnHierarchyNode)
            } else {
                const parentEntry = pickColumnHierarchyNodeByNamePath(
                    state.children,
                    parentNamePath
                )
                parentEntry?.children.push(columnHierarchyNode)
            }
        },
        submitColumnError(state: ColumnSelectionState) {
            state.isSubmittingDefinition = false
        },
        setEditColumn(
            state: ColumnSelectionState,
            action: PayloadAction<Column>
        ) {
            state.editColumn.value = action.payload
        },
        clearEditColumn(state: ColumnSelectionState) {
            state.editColumn.value = undefined
        },
        editColumnStart(
            state: ColumnSelectionState,
            action: PayloadAction<string>
        ) {
            if (state.editColumn.value?.idPersistent == action.payload) {
                state.editColumn.isLoading = true
            }
        },
        editColumnError(
            state: ColumnSelectionState,
            action: PayloadAction<string>
        ) {
            if (state.editColumn.value?.idPersistent == action.payload) {
                state.editColumn.isLoading = false
            }
        },
        dragColumnStart(state: ColumnSelectionState) {
            state.isDragging = true
        },
        dragColumnEnd(state: ColumnSelectionState) {
            state.isDragging = false
        },
        getColumnDetailsError(
            state: ColumnSelectionState,
            action: PayloadAction<string[]>
        ) {
            for (const idPersistent of action.payload) {
                const remoteColumn =
                    state.columnsByIdPersistent[idPersistent]
                if (remoteColumn === undefined) {
                    state.columnsByIdPersistent[idPersistent] = newRemote(
                        undefined,
                        false
                    )
                } else {
                    remoteColumn.isLoading = false
                }
            }
        },
        getColumnDetailsStart(
            state: ColumnSelectionState,
            action: PayloadAction<string[]>
        ) {
            for (const idPersistent of action.payload) {
                const remoteColumn =
                    state.columnsByIdPersistent[idPersistent]
                if (remoteColumn === undefined) {
                    state.columnsByIdPersistent[idPersistent] = newRemote(
                        undefined,
                        true
                    )
                } else {
                    remoteColumn.isLoading = true
                }
            }
        },
        getColumnDetailsSuccess(
            state: ColumnSelectionState,
            action: PayloadAction<Column[]>
        ) {
            for (const column of action.payload) {
                state.columnsByIdPersistent[column.idPersistent] =
                    newRemote(column)
            }
        },
        changeParentSuccess(
            state: ColumnSelectionState,
            action: PayloadAction<{
                oldPathToColumn: number[]
                pathToNewParent: number[]
                column: Column
            }>
        ) {
            const columnsByIdPersistent = state.columnsByIdPersistent
            if (columnsByIdPersistent === undefined) {
                throw Error('Column definitions cache not populated.')
            }
            const column = action.payload.column
            const oldPathToColumn = action.payload.oldPathToColumn
            let originHierarchyArray = state.children
            let oldNamePathPrefixLength = 0
            if (oldPathToColumn.length > 1) {
                // get old parent information
                const oldParentHierarchyNode = pickColumnHierarchyNode(
                    state.children,
                    oldPathToColumn.slice(0, -1)
                )
                if (oldParentHierarchyNode === undefined) {
                    throw Error('Could not find parent in column hierarchy.')
                }
                originHierarchyArray = oldParentHierarchyNode.children
                oldNamePathPrefixLength = oldPathToColumn.length - 1
            }
            const columnHierarchyNode =
                originHierarchyArray[
                    oldPathToColumn[oldPathToColumn.length - 1]
                ]
            if (columnHierarchyNode === undefined) {
                throw new Error('could not find column hierarchy node')
            }
            let namePath: string[] = []
            let destinationHierarchyArray: ColumnIdHierarchyNode[] | undefined =
                state.children
            // get new parent information
            if (column.idParentPersistent !== undefined) {
                const newParentHierarchyNode = pickColumnHierarchyNode(
                    state.children,
                    action.payload.pathToNewParent
                )
                if (newParentHierarchyNode === undefined) {
                    throw Error('Could not find new parent in column hierarchy')
                }
                destinationHierarchyArray = newParentHierarchyNode?.children
                namePath =
                    state.columnsByIdPersistent[
                        newParentHierarchyNode?.idColumnPersistent ?? ''
                    ]?.value?.namePath ?? namePath
            }
            if (destinationHierarchyArray === undefined) {
                throw Error('Could not find destination array for moved column.')
            }
            updateNamePaths(
                columnHierarchyNode,
                columnsByIdPersistent,
                oldNamePathPrefixLength,
                namePath
            )
            columnsByIdPersistent[column.idPersistent] =
                newRemote(column)
            destinationHierarchyArray.push(columnHierarchyNode)
            // remove hierarchy node from old parent's child array
            for (let idx = 0; idx < originHierarchyArray.length; idx++) {
                if (
                    originHierarchyArray[idx].idColumnPersistent ==
                    action.payload.column.idPersistent
                ) {
                    originHierarchyArray.splice(idx, 1)
                    break
                }
            }
            if (
                state.editColumn.value?.idPersistent ==
                action.payload.column.idPersistent
            ) {
                state.editColumn = newRemote(undefined)
            }
        }
    }
})

function pickColumnHierarchyNode(
    entries: ColumnIdHierarchyNode[],
    path: number[]
): ColumnIdHierarchyNode | undefined {
    let ret = entries[path[0]]
    for (let idx = 1; idx < path.length; ++idx) {
        ret = ret?.children[path[idx]]
    }
    return ret
}

function pickColumnHierarchyNodeByNamePath(
    entries: ColumnIdHierarchyNode[],
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
    rootEntry: ColumnIdHierarchyNode,
    columns: { [key: string]: RemoteInterface<Column | undefined> },
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
        const column = columns[entry.idColumnPersistent].value
        if (column !== undefined) {
            column.namePath.splice(0, oldPrefixLength, ...newPrefix)
        }
    }
}

function updateNodesFromExisting(
    existingNodes: ColumnIdHierarchyNode[],
    newNodes: ColumnIdHierarchyNode[]
) {
    const existingIndices = Object.fromEntries(
        existingNodes.map((node, idx) => [node.idColumnPersistent, idx])
    )
    for (const node of newNodes) {
        const existingIdx = existingIndices[node.idColumnPersistent]
        if (existingIdx !== undefined) {
            node.isExpanded = existingNodes[existingIdx].isExpanded
        }
    }
}

export const columnSelectionReducer = columnSelectionSlice.reducer

export const {
    loadColumnHierarchyError,
    loadColumnHierarchyStart,
    loadColumnHierarchySuccess,
    startSearch,
    submitColumnError,
    submitColumnStart,
    submitColumnSuccess,
    toggleExpansion,
    setEditColumn,
    clearEditColumn,
    editColumnStart,
    editColumnError,
    changeParentSuccess,
    dragColumnStart,
    dragColumnEnd,
    curateColumnError,
    curateColumnStart,
    curateColumnSuccess,
    getColumnDetailsError,
    getColumnDetailsStart,
    getColumnDetailsSuccess
} = columnSelectionSlice.actions
