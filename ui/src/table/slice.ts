import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    CellValue,
    Entity,
    TableState,
    displayTextColumn,
    newColumnState,
    newTableState
} from './state'
import { newRemote } from '../util/state'
import { TagDefinition } from '../column_menu/state'
import { Rectangle } from '@glideapps/glide-data-grid'

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
                columnData: { [key: string]: CellValue[] }
            }>
        ) {
            const colIdx = state.columnIndices[action.payload.idPersistent]
            if (colIdx !== undefined) {
                state.columnStates[colIdx].cellContents = newRemote(
                    state.entities?.map((entity) =>
                        entity.idPersistent in action.payload.columnData
                            ? action.payload.columnData[entity.idPersistent]
                            : []
                    ) ?? []
                )
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
                appendDisplayTextToColumnStates(state, entity)
                state.entityIndices[entity.idPersistent] = 0
            } else {
                const idx = state.entityIndices[entity.idPersistent]
                if (idx === undefined) {
                    state.entities.push(action.payload)
                    appendDisplayTextToColumnStates(state, entity)
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

function appendDisplayTextToColumnStates(state: TableState, entity: Entity) {
    if (state.columnStates.length == 0) {
        state.columnStates = [newColumnState({ tagDefinition: displayTextColumn })]
        state.columnIndices = { displayTxtColumnId: 0 }
    }
    state.columnStates[0].cellContents.value.push([
        {
            value: entity.displayTxt,
            idPersistent: entity.idPersistent,
            version: entity.version
        }
    ])
    for (let idx = 1; idx < state.columnStates.length; ++idx) {
        state.columnStates[idx].cellContents.value.push([])
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
    toggleSearch
} = tableSlice.actions
