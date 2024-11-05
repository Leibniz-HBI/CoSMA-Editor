import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    CellValue,
    TableState,
    newColumnState,
    newTableState,
    justificationColumnId,
    optionalEntityJustificationColumnIdx
} from './state'
import { Entity } from '../entity/state'
import { newRemote } from '../util/state'
import { Rectangle } from '@glideapps/glide-data-grid'
import { Comment } from '../comments/slice'

const initialState = newTableState({})

export type Edit = [string, string, CellValue]

const tableSlice = createSlice({
    name: 'table',
    initialState: initialState,
    reducers: {
        setEntityLoading(state: TableState) {
            state.isLoading = true
        },
        setEntities(state: TableState, action: PayloadAction<Entity[]>) {
            state.entities = action.payload
            state.isLoading = false
            state.entityIndices = Object.fromEntries(
                action.payload.map((entity, idx) => [entity.idPersistent, idx])
            )
        },
        appendColumn(
            state: TableState,
            action: PayloadAction<{
                idPersistent: string
                columnData?: { [key: string]: CellValue[] }
            }>
        ) {
            const colIdx = state.columnIndices[action.payload.idPersistent]
            const columnData = action.payload.columnData
            if (colIdx !== undefined) {
                if (columnData === undefined) {
                    state.columnStates[colIdx].cellContents = newRemote([])
                } else {
                    state.columnStates[colIdx].cellContents = newRemote(
                        state.entities?.map((entity) =>
                            entity.idPersistent in columnData
                                ? columnData[entity.idPersistent]
                                : []
                        ) ?? []
                    )
                }
            }
        },
        setColumnLoading(state: TableState, action: PayloadAction<string>) {
            const idTagDefinitionPersistent = action.payload
            const columnIdx = state.columnIndices[idTagDefinitionPersistent]
            const columnState = newColumnState({
                idTagDefinitionPersistent: idTagDefinitionPersistent,
                cellContents: newRemote([], true)
            })
            if (columnIdx === undefined) {
                state.columnIndices[idTagDefinitionPersistent] =
                    state.columnStates.length
                state.columnStates.push(columnState)
            } else {
                state.columnStates[columnIdx] = columnState
            }
        },
        showColumnAddMenu(state: TableState) {
            state.showColumnAddMenu = true
        },
        hideColumnAddMenu(state: TableState) {
            state.showColumnAddMenu = false
        },
        showHeaderMenu(
            state: TableState,
            action: PayloadAction<{ columnIdx: number; bounds: Rectangle }>
        ) {
            state.selectedTagDefinitionId =
                state.columnStates[action.payload.columnIdx].idTagDefinitionPersistent
            state.selectedColumnHeaderBounds = action.payload.bounds
        },
        hideHeaderMenu(state: TableState) {
            clearSelectedColumn(state)
        },
        removeSelectedColumn(state: TableState) {
            if (state.selectedTagDefinitionId === undefined) {
                state.selectedColumnHeaderBounds = undefined
            } else {
                removeColumnByIdPersistentHelper(state, state.selectedTagDefinitionId)
            }
        },
        showEntityJustification(state: TableState) {
            if (state.showEntityJustifications) {
                return
            }
            const columnState = newColumnState({
                idTagDefinitionPersistent: justificationColumnId,
                cellContents: newRemote([])
            })
            state.columnStates.splice(
                optionalEntityJustificationColumnIdx,
                0,
                columnState
            )
            generateColumnStateIndices(state)
            state.showEntityJustifications = true
        },
        removeColumnByIdPersistent(state: TableState, action: PayloadAction<string>) {
            removeColumnByIdPersistentHelper(state, action.payload)
        },
        setColumnWidth(
            state: TableState,
            action: PayloadAction<{ columnIdx: number; width: number }>
        ) {
            state.columnStates[action.payload.columnIdx].width = action.payload.width
        },
        changeColumnIndex(
            state: TableState,
            action: PayloadAction<{ startIdx: number; endIdx: number }>
        ) {
            if (
                action.payload.startIdx == action.payload.endIdx ||
                action.payload.endIdx < state.frozenColumns ||
                action.payload.startIdx < state.frozenColumns
            ) {
                return
            }
            const tmp = state.columnStates[action.payload.endIdx]
            state.columnStates[action.payload.endIdx] =
                state.columnStates[action.payload.startIdx]
            state.columnIndices[
                state.columnStates[action.payload.endIdx].idTagDefinitionPersistent
            ] = action.payload.endIdx
            state.columnStates[action.payload.startIdx] = tmp
            state.columnIndices[tmp.idTagDefinitionPersistent] = action.payload.startIdx
        },
        setLoadDataError(state: TableState) {
            state.isLoading = false
        },
        submitValuesStart(state: TableState) {
            state.isSubmittingValues = true
        },
        submitValuesError(state: TableState) {
            state.isSubmittingValues = false
        },
        submitValuesSuccess(state: TableState, action: PayloadAction<Edit[]>) {
            state.isSubmittingValues = false
            if (action.payload.length != 1) {
                return
            }
            const [idEntity, idPersistentColumn, value] = action.payload[0]
            const idxColumn = state.columnIndices[idPersistentColumn]
            if (idxColumn === undefined) {
                return
            }
            const idxEntity = state.entityIndices[idEntity]
            if (idxEntity === undefined) {
                return
            }
            state.columnStates[idxColumn].cellContents.value[idxEntity] = [value]
        },
        tagChangeOwnerShipShow(state: TableState, action: PayloadAction<string>) {
            state.ownershipChangeTagDefinitionIdPersistent = action.payload
        },
        tagChangeOwnershipHide(state: TableState) {
            state.ownershipChangeTagDefinitionIdPersistent = undefined
        },
        showEntityAdd(state: TableState) {
            state.showEntityAddDialog = true
        },
        hideEntityAdd(state: TableState) {
            state.showEntityAddDialog = false
        },
        toggleSearch(state: TableState, action: PayloadAction<boolean>) {
            state.showSearch = action.payload
        },
        entityChangeOrCreateStart(state: TableState) {
            state.entityAddState.isLoading = true
        },
        entityChangeOrCreateSuccess(state: TableState, action: PayloadAction<Entity>) {
            state.entityAddState = newRemote(true)
            const entity = action.payload
            if (state.entities === undefined) {
                state.entities = [entity]
                state.entityIndices[entity.idPersistent] = 0
                for (const columnState of state.columnStates) {
                    columnState.cellContents = newRemote([[]])
                }
            } else {
                const idx = state.entityIndices[entity.idPersistent]
                if (idx === undefined) {
                    state.entityIndices[entity.idPersistent] = state.entities.length
                    state.entities.push(action.payload)
                    for (const columnState of state.columnStates) {
                        columnState.cellContents.value.push([])
                    }
                } else {
                    state.entities[idx] = entity
                    state.columnStates[0].cellContents.value[idx] = [
                        {
                            value: entity.displayTxt,
                            idPersistent: entity.idPersistent,
                            version: entity.version
                        }
                    ]
                }
            }
        },
        entityChangeOrCreateError(state: TableState) {
            state.entityAddState.isLoading = false
        },
        toggleEntityMergingModal(state: TableState, action: PayloadAction<boolean>) {
            state.showEntityMergingModal = action.payload
        },
        clearEntityJustificationHistory(state: TableState) {
            state.entityJustificationHistory = newRemote([])
        },
        showEntityJustificationHistory(
            state: TableState,
            action: PayloadAction<string | undefined>
        ) {
            state.showEntityJustificationHistoryForIdPersistent = newRemote(
                action.payload
            )
        },
        hideEntityJustificationHistory(state: TableState) {
            state.showEntityJustificationHistoryForIdPersistent = newRemote(undefined)
        },
        loadEntityJustificationHistoryStart(state: TableState) {
            state.entityJustificationHistory = newRemote([], true)
        },
        loadEntityJustificationHistorySuccess(
            state: TableState,
            action: PayloadAction<Comment[]>
        ) {
            state.entityJustificationHistory = newRemote(action.payload)
        },
        loadEntityJustificationHistoryError(state: TableState) {
            state.entityJustificationHistory.isLoading = false
        },
        submitEntityJustificationStart(state: TableState) {
            state.showEntityJustificationHistoryForIdPersistent.isLoading = true
        },
        submitEntityJustificationSuccess(
            state: TableState,
            action: PayloadAction<
                { idEntityPersistent: string; comment: Comment } | undefined
            >
        ) {
            state.showEntityJustificationHistoryForIdPersistent.isLoading = false
            if (action.payload !== undefined) {
                state.entityJustificationHistory.value.push(action.payload.comment)
                const idx = state.entityIndices[action.payload.idEntityPersistent]
                if (idx !== undefined && state.entities !== undefined) {
                    const entity = state.entities[idx]
                    if (entity !== undefined) {
                        entity.justificationTxt = action.payload.comment.content
                    }
                }
            }
        },
        submitEntityJustificationError(state: TableState) {
            state.showEntityJustificationHistoryForIdPersistent.isLoading = false
        }
    }
})

export const tableReducer = tableSlice.reducer

function generateColumnStateIndices(state: TableState) {
    state.columnIndices = Object.fromEntries(
        state.columnStates.map((state, idx) => [state.idTagDefinitionPersistent, idx])
    )
}

function removeColumnByIdPersistentHelper(state: TableState, idPersistent: string) {
    if (idPersistent == justificationColumnId && state.showEntityJustifications) {
        state.showEntityJustifications = false
    }
    const columnIdx = state.columnIndices[idPersistent]
    if (columnIdx !== undefined) {
        state.columnStates.splice(columnIdx, 1)
    }
    generateColumnStateIndices(state)
    clearSelectedColumn(state)
}
function clearSelectedColumn(state: TableState) {
    state.selectedColumnHeaderBounds = undefined
    state.selectedTagDefinitionId = undefined
}

export const {
    appendColumn,
    changeColumnIndex,
    entityChangeOrCreateError,
    entityChangeOrCreateStart,
    entityChangeOrCreateSuccess,
    hideColumnAddMenu,
    hideEntityAdd,
    hideHeaderMenu,
    removeColumnByIdPersistent,
    removeSelectedColumn,
    setColumnLoading,
    setColumnWidth,
    setEntities,
    setEntityLoading,
    setLoadDataError,
    showColumnAddMenu,
    showEntityAdd,
    showHeaderMenu,
    submitValuesError,
    submitValuesStart,
    submitValuesSuccess,
    tagChangeOwnerShipShow,
    tagChangeOwnershipHide,
    toggleEntityMergingModal,
    showEntityJustification,
    toggleSearch,
    clearEntityJustificationHistory,
    loadEntityJustificationHistoryStart,
    loadEntityJustificationHistorySuccess,
    loadEntityJustificationHistoryError,
    showEntityJustificationHistory,
    hideEntityJustificationHistory,
    submitEntityJustificationStart,
    submitEntityJustificationError,
    submitEntityJustificationSuccess
} = tableSlice.actions
