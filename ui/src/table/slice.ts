import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    CellValue,
    Entity,
    TableState,
    newColumnState,
    newTableState,
    reasonColumn
} from './state'
import { newRemote } from '../util/state'
import { TagDefinition } from '../column_menu/state'
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
        setColumnLoading(state: TableState, action: PayloadAction<TagDefinition>) {
            const idTagDefinitionPersistent = action.payload.idPersistent
            const columnIdx = state.columnIndices[idTagDefinitionPersistent]
            const columnState = newColumnState({
                tagDefinition: action.payload,
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
            state.selectedTagDefinition =
                state.columnStates[action.payload.columnIdx].tagDefinition
            state.selectedColumnHeaderBounds = action.payload.bounds
        },
        hideHeaderMenu(state: TableState) {
            clearSelectedColumn(state)
        },
        removeSelectedColumn(state: TableState) {
            if (state.selectedTagDefinition === undefined) {
                state.selectedColumnHeaderBounds = undefined
            } else {
                removeColumnByIdPersistentHelper(
                    state,
                    state.selectedTagDefinition.idPersistent
                )
            }
        },
        toggleEntityReason(state: TableState, action: PayloadAction<boolean>) {
            if (action.payload) {
                const columnState = newColumnState({
                    tagDefinition: reasonColumn,
                    cellContents: newRemote([])
                })
                state.columnStates.splice(1, 0, columnState)
            } else {
                state.columnStates.splice(1, 1)
            }
            state.showEntityReasons = action.payload
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
                state.columnStates[action.payload.endIdx].tagDefinition.idPersistent
            ] = action.payload.endIdx
            state.columnStates[action.payload.startIdx] = tmp
            state.columnIndices[tmp.tagDefinition.idPersistent] =
                action.payload.startIdx
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
        curateTagDefinitionStart(_state: TableState) {
            return
        },
        //TODO still needed? better placed at tag definition slice?
        tagDefinitionChange(state: TableState, action: PayloadAction<TagDefinition>) {
            updateTagDefinition(state, action.payload)
        },
        curateTagDefinitionError(_state: TableState) {
            return
        },
        tagChangeOwnerShipShow(
            state: TableState,
            action: PayloadAction<TagDefinition>
        ) {
            state.ownershipChangeTagDefinition = action.payload
        },
        tagChangeOwnershipHide(state: TableState) {
            state.ownershipChangeTagDefinition = undefined
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
            } else {
                const idx = state.entityIndices[entity.idPersistent]
                if (idx === undefined) {
                    state.entities.push(action.payload)
                    state.entityIndices[entity.idPersistent] = state.entities.length
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
        clearEntityReasonHistory(state: TableState) {
            state.entityReasonHistory = newRemote([])
        },
        showEntityReasonHistory(
            state: TableState,
            action: PayloadAction<string | undefined>
        ) {
            state.showEntityReasonHistoryForIdPersistent = newRemote(action.payload)
        },
        hideEntityReasonHistory(state: TableState) {
            state.showEntityReasonHistoryForIdPersistent = newRemote(undefined)
        },
        loadEntityReasonHistoryStart(state: TableState) {
            state.entityReasonHistory = newRemote([], true)
        },
        loadEntityReasonHistorySuccess(
            state: TableState,
            action: PayloadAction<Comment[]>
        ) {
            state.entityReasonHistory = newRemote(action.payload)
        },
        loadEntityReasonHistoryError(state: TableState) {
            state.entityReasonHistory.isLoading = false
        },
        submitEntityReasonStart(state: TableState) {
            state.showEntityReasonHistoryForIdPersistent.isLoading = true
        },
        submitEntityReasonSuccess(
            state: TableState,
            action: PayloadAction<{ idEntityPersistent: string; comment: Comment }>
        ) {
            state.entityReasonHistory.value.push(action.payload.comment)
            const idx = state.entityIndices[action.payload.idEntityPersistent]
            if (idx !== undefined && state.entities !== undefined) {
                const entity = state.entities[idx]
                if (entity !== undefined) {
                    entity.reasonTxt = action.payload.comment.content
                }
            }
        },
        submitEntityReasonError(state: TableState) {
            state.showEntityReasonHistoryForIdPersistent.isLoading = false
        }
    }
})

export const tableReducer = tableSlice.reducer

function removeColumnByIdPersistentHelper(state: TableState, idPersistent: string) {
    const columnIdx = state.columnIndices[idPersistent]
    if (columnIdx !== undefined) {
        state.columnStates.splice(columnIdx, 1)
        state.columnIndices = Object.fromEntries(
            state.columnStates.map((columnState, idx) => [
                columnState.tagDefinition.idPersistent,
                idx
            ])
        )
    }
    clearSelectedColumn(state)
}
function clearSelectedColumn(state: TableState) {
    state.selectedColumnHeaderBounds = undefined
    state.selectedTagDefinition = undefined
}
function updateTagDefinition(state: TableState, tagDefinition: TagDefinition) {
    const idxColumnState = state.columnIndices[tagDefinition.idPersistent]
    if (idxColumnState === undefined) {
        return
    }
    state.columnStates[idxColumnState].tagDefinition = {
        ...state.columnStates[idxColumnState].tagDefinition,
        curated: tagDefinition.curated
    }
}

export const {
    appendColumn,
    changeColumnIndex,
    curateTagDefinitionError,
    curateTagDefinitionStart,
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
    tagDefinitionChange,
    toggleEntityMergingModal,
    toggleEntityReason,
    toggleSearch,
    clearEntityReasonHistory,
    loadEntityReasonHistoryStart,
    loadEntityReasonHistorySuccess,
    loadEntityReasonHistoryError,
    showEntityReasonHistory,
    hideEntityReasonHistory,
    submitEntityReasonStart,
    submitEntityReasonError,
    submitEntityReasonSuccess
} = tableSlice.actions
