import { ColumnState, TableState } from './state'
import {
    SetEntitiesAction,
    AppendColumnAction,
    SetLoadDataErrorAction,
    SetEntityLoadingAction,
    SetColumnLoadingAction,
    TableAction,
    ShowColumnAddMenuAction,
    HideColumnAddMenuAction,
    ShowHeaderMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    ChangeColumnIndexAction,
    SubmitValuesStartAction,
    SubmitValuesEndAction,
    SubmitValuesErrorAction,
    SubmitValuesClearErrorAction
} from './actions'
import { ErrorState } from '../util/error'

export function tableReducer(state: TableState, action: TableAction) {
    if (action instanceof SetEntityLoadingAction) {
        return new TableState({
            ...state,
            isLoading: true,
            loadDataErrorState: undefined
        })
    } else if (action instanceof SetEntitiesAction) {
        const entityIndices = new Map(
            action.entities.map((entityId: string, idx: number) => [entityId, idx])
        )
        return new TableState({
            ...state,
            entities: action.entities,
            entityIndices: entityIndices,
            isLoading: false
        })
    } else if (action instanceof AppendColumnAction) {
        const col_idx = state.columnIndices.get(action.idPersistent)
        if (col_idx !== undefined) {
            return new TableState({
                ...state,
                columnStates: [
                    ...state.columnStates.slice(0, col_idx),
                    new ColumnState({
                        name: state.columnStates[col_idx].name,
                        isLoading: false,
                        cellContents: state.entities?.map((idEntity) =>
                            idEntity in action.columnData
                                ? action.columnData[idEntity]
                                : []
                        ),
                        idPersistent: state.columnStates[col_idx].idPersistent,
                        columnType: state.columnStates[col_idx].columnType
                    }),
                    ...state.columnStates.slice(col_idx + 1)
                ]
            })
        }
    } else if (action instanceof SetColumnLoadingAction) {
        const column_idx =
            state.columnIndices.get(action.idPersistent) ?? state.columnStates.length
        const newColumnIndices = new Map(state.columnIndices)
        newColumnIndices.set(action.idPersistent, column_idx)
        return new TableState({
            ...state,
            columnIndices: newColumnIndices,
            columnStates: [
                ...state.columnStates.slice(0, column_idx),
                new ColumnState({
                    name: action.name,
                    idPersistent: action.idPersistent,
                    isLoading: true,
                    columnType: action.columnType
                }),
                ...state.columnStates.slice(column_idx + 1)
            ]
        })
    } else if (action instanceof ShowColumnAddMenuAction) {
        return new TableState({
            ...state,
            showColumnAddMenu: true
        })
    } else if (action instanceof HideColumnAddMenuAction) {
        return new TableState({
            ...state,
            showColumnAddMenu: false
        })
    } else if (action instanceof ShowHeaderMenuAction) {
        return new TableState({
            ...state,
            selectedColumnHeaderByIdPersistent:
                state.columnStates[action.columnIndex].idPersistent,
            selectedColumnHeaderBounds: action.bounds
        })
    } else if (action instanceof HideHeaderMenuAction) {
        return new TableState({
            ...state,
            selectedColumnHeaderByIdPersistent: undefined,
            selectedColumnHeaderBounds: undefined
        })
    } else if (action instanceof RemoveSelectedColumnAction) {
        if (state.selectedColumnHeaderByIdPersistent === undefined) {
            return new TableState({
                ...state,
                selectedColumnHeaderBounds: undefined,
                selectedColumnHeaderByIdPersistent: undefined
            })
        }
        const columnIdx = state.columnIndices.get(
            state.selectedColumnHeaderByIdPersistent
        )
        if (columnIdx === undefined) {
            return new TableState({
                ...state,
                selectedColumnHeaderBounds: undefined,
                selectedColumnHeaderByIdPersistent: undefined
            })
        }

        const columnStates = [
            ...state.columnStates.slice(undefined, columnIdx),
            ...state.columnStates.slice(columnIdx + 1, undefined)
        ]
        const columnIndices = new Map<string, number>()
        for (let idx = 0; idx < columnStates.length; ++idx) {
            columnIndices.set(columnStates[idx].idPersistent, idx)
        }
        return new TableState({
            ...state,
            columnStates: columnStates,
            columnIndices: columnIndices,
            selectedColumnHeaderBounds: undefined,
            selectedColumnHeaderByIdPersistent: undefined
        })
    } else if (action instanceof SetColumnWidthAction) {
        return new TableState({
            ...state,
            columnStates: [
                ...state.columnStates.slice(0, action.columnIdx),
                new ColumnState({
                    ...state.columnStates[action.columnIdx],
                    width: action.width
                }),
                ...state.columnStates.slice(action.columnIdx + 1)
            ]
        })
    } else if (action instanceof ChangeColumnIndexAction) {
        if (action.endIndex == action.startIndex) {
            return state
        }
        if (
            action.endIndex < state.frozenColumns ||
            action.startIndex < state.frozenColumns
        ) {
            return state
        }
        let newColumnStates
        if (action.startIndex > action.endIndex) {
            newColumnStates = [
                ...state.columnStates.slice(0, action.endIndex),
                state.columnStates[action.startIndex],
                ...state.columnStates.slice(action.endIndex, action.startIndex),
                ...state.columnStates.slice(action.startIndex + 1)
            ]
        } else {
            newColumnStates = [
                ...state.columnStates.slice(0, action.startIndex),
                ...state.columnStates.slice(action.startIndex + 1, action.endIndex + 1),
                state.columnStates[action.startIndex],
                ...state.columnStates.slice(action.endIndex + 1)
            ]
        }
        const newColumnIndices = new Map<string, number>()
        for (let idx = 0; idx < newColumnStates.length; ++idx) {
            newColumnIndices.set(newColumnStates[idx].idPersistent, idx)
        }
        return new TableState({
            ...state,
            columnStates: newColumnStates,
            columnIndices: newColumnIndices
        })
    } else if (action instanceof SetLoadDataErrorAction) {
        return new TableState({
            ...state,
            isLoading: false,
            loadDataErrorState: new ErrorState(action.msg, action.retryCallback),
            rowObjects: undefined
        })
    } else if (action instanceof SubmitValuesStartAction) {
        return new TableState({
            ...state,
            isSubmittingValues: true,
            submitValuesErrorState: undefined
        })
    } else if (action instanceof SubmitValuesErrorAction) {
        return new TableState({
            ...state,
            isSubmittingValues: false,
            submitValuesErrorState: new ErrorState(
                action.errorMsg,
                action.retryCallback
            )
        })
    } else if (action instanceof SubmitValuesEndAction) {
        if (action.edits.length == 0) {
            return new TableState({ ...state, isSubmittingValues: false })
        }
        if (action.edits.length > 1) {
            const batchErrorMsg = 'Batch edits not implemented. Values are not changed.'
            return new TableState({
                ...state,
                isSubmittingValues: false,
                submitValuesErrorState: new ErrorState(batchErrorMsg)
            })
        }
        const [idEntity, idPersistentColumn, value] = action.edits[0]
        const idxColumn = state.columnIndices.get(idPersistentColumn)
        if (idxColumn === undefined) {
            return state
        }
        const idxEntity = state.entityIndices.get(idEntity)
        if (idxEntity === undefined) {
            return state
        }
        return new TableState({
            ...state,
            isSubmittingValues: false,
            columnStates: [
                ...state.columnStates.slice(0, idxColumn),
                new ColumnState({
                    ...state.columnStates[idxColumn],
                    cellContents: [
                        ...state.columnStates[idxColumn].cellContents.slice(
                            0,
                            idxEntity
                        ),
                        [value],
                        ...state.columnStates[idxColumn].cellContents.slice(
                            idxEntity + 1
                        )
                    ]
                }),
                ...state.columnStates.slice(idxColumn + 1)
            ]
        })
    } else if (action instanceof SubmitValuesClearErrorAction) {
        return new TableState({ ...state, submitValuesErrorState: undefined })
    }
    return state
}
