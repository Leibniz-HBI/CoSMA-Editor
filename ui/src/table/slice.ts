import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    CellValue,
    TableState,
    newColumnState,
    newTableState,
    justificationColumnId,
    optionalEntityJustificationColumnIdx,
    FilterClause
} from './state'
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
        setEntities(state: TableState, action: PayloadAction<string[]>) {
            state.entityIdList = action.payload
            state.isLoading = false
            state.entityIndices = Object.fromEntries(
                state.entityIdList.map((idPersistent, idx) => [idPersistent, idx])
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
                        state.entityIdList?.map((idPersistent) =>
                            idPersistent in columnData ? columnData[idPersistent] : []
                        ) ?? []
                    )
                }
            }
        },
        setColumnLoading(state: TableState, action: PayloadAction<string>) {
            const idColumnPersistent = action.payload
            const columnIdx = state.columnIndices[idColumnPersistent]
            const columnState = newColumnState({
                idColumnPersistent: idColumnPersistent,
                cellContents: newRemote([], true)
            })
            if (columnIdx === undefined) {
                state.columnIndices[idColumnPersistent] = state.columnStates.length
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
            state.selectedColumnId =
                state.columnStates[action.payload.columnIdx].idColumnPersistent
            state.selectedColumnHeaderBounds = action.payload.bounds
        },
        hideHeaderMenu(state: TableState) {
            clearSelectedColumn(state)
        },
        removeSelectedColumn(state: TableState) {
            if (state.selectedColumnId === undefined) {
                state.selectedColumnHeaderBounds = undefined
            } else {
                removeColumnByIdPersistentHelper(state, state.selectedColumnId)
            }
        },
        showEntityJustification(state: TableState) {
            if (
                state.showEntityJustifications &&
                state.columnStates.at(optionalEntityJustificationColumnIdx)
                    ?.idColumnPersistent === justificationColumnId
            ) {
                return
            }
            const columnState = newColumnState({
                idColumnPersistent: justificationColumnId,
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
                state.columnStates[action.payload.endIdx].idColumnPersistent
            ] = action.payload.endIdx
            state.columnStates[action.payload.startIdx] = tmp
            state.columnIndices[tmp.idColumnPersistent] = action.payload.startIdx
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
        columnChangeOwnershipShow(state: TableState, action: PayloadAction<string>) {
            state.ownershipChangeColumnIdPersistent = action.payload
        },
        columnChangeOwnershipHide(state: TableState) {
            state.ownershipChangeColumnIdPersistent = undefined
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
        entityChangeOrCreateSuccess(state: TableState, action: PayloadAction<string>) {
            state.entityAddState = newRemote(true)
            const idPersistent = action.payload
            if (state.entityIdList === undefined) {
                state.entityIdList = [idPersistent]
                state.entityIndices[idPersistent] = 0
                for (const columnState of state.columnStates) {
                    columnState.cellContents = newRemote([[]])
                }
            } else {
                const idx = state.entityIndices[idPersistent]
                if (idx === undefined) {
                    state.entityIndices[idPersistent] = state.entityIdList.length
                    state.entityIdList.push(action.payload)
                    for (const columnState of state.columnStates) {
                        columnState.cellContents.value.push([])
                    }
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
        clearTable(state: TableState) {
            state.columnStates = []
            state.columnIndices = {}
            state.entityIdList = undefined
        },
        setHistoryDate(state: TableState, action: PayloadAction<number | undefined>) {
            state.historyDateSinceEpoch = action.payload
            // need to reset entities to start loading
            state.entityIdList = undefined
            state.columnStates = state.columnStates.map((state) => {
                return { ...state, cellContents: newRemote([]) }
            })
        },
        addJustificationToOpenHistory(
            state: TableState,
            action: PayloadAction<Comment>
        ) {
            if (state.entityJustificationHistory.value !== undefined) {
                state.entityJustificationHistory.value.push(action.payload)
            }
        },
        setShowFilterEditor(state: TableState, action: PayloadAction<boolean>) {
            state.showFilterEditor = action.payload
        },
        setFilter(state: TableState, action: PayloadAction<FilterClause | undefined>) {
            state.filter = action.payload
            state.entityIdList = undefined
            state.columnStates = state.columnStates.map((state) => {
                return { ...state, cellContents: newRemote([]) }
            })
            generateColumnStateIndices(state)
        },
        setShowMergeRequestForm(state: TableState, action: PayloadAction<boolean>) {
            state.showMergeRequestForm = action.payload
        }
    }
})

export const tableReducer = tableSlice.reducer

function generateColumnStateIndices(state: TableState) {
    state.columnIndices = Object.fromEntries(
        state.columnStates.map((state, idx) => [state.idColumnPersistent, idx])
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
    state.selectedColumnId = undefined
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
    columnChangeOwnershipShow,
    columnChangeOwnershipHide,
    toggleEntityMergingModal,
    showEntityJustification,
    toggleSearch,
    clearEntityJustificationHistory,
    loadEntityJustificationHistoryStart,
    loadEntityJustificationHistorySuccess,
    loadEntityJustificationHistoryError,
    showEntityJustificationHistory,
    hideEntityJustificationHistory,
    clearTable,
    setHistoryDate,
    addJustificationToOpenHistory,
    setShowFilterEditor,
    setFilter,
    setShowMergeRequestForm
} = tableSlice.actions
