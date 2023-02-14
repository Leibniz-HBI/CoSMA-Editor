import { ColumnState, TableState } from './state'
import {
    SetEntitiesAction,
    AppendColumnAction,
    SetErrorAction,
    SetEntityLoadingAction,
    SetColumnLoadingAction,
    TableAction,
    ShowColumnAddMenuAction,
    HideColumnAddMenuAction,
    ShowHeaderMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    ChangeColumnIndexAction
} from './actions'

export function tableReducer(state: TableState, action: TableAction) {
    if (action instanceof SetEntityLoadingAction) {
        return new TableState({
            ...state,
            isLoading: true,
            errorMsg: undefined
        })
    } else if (action instanceof SetEntitiesAction) {
        return new TableState({
            ...state,
            entities: action.entities,
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
                        cellContents: action.columnData,
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
        let smallerIndex, largerIndex
        if (action.endIndex < action.startIndex) {
            smallerIndex = action.endIndex
            largerIndex = action.startIndex
        } else {
            smallerIndex = action.startIndex
            largerIndex = action.endIndex
        }
        if (smallerIndex < state.frozenColumns) {
            return state
        }
        const newColumnStates = [
            ...state.columnStates.slice(0, smallerIndex),
            ...state.columnStates.slice(smallerIndex + 1, largerIndex + 1),
            state.columnStates[smallerIndex],
            ...state.columnStates.slice(largerIndex + 1)
        ]
        const newColumnIndices = new Map<string, number>()
        for (let idx = 0; idx < newColumnStates.length; ++idx) {
            newColumnIndices.set(newColumnStates[idx].idPersistent, idx)
        }
        return new TableState({
            ...state,
            columnStates: newColumnStates,
            columnIndices: newColumnIndices
        })
    } else if (action instanceof SetErrorAction) {
        return new TableState({
            ...state,
            isLoading: false,
            errorMsg: action.msg,
            rowObjects: undefined
        })
    }
    return state
}
