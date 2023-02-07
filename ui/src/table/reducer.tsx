import { ColumnState, TableState } from './state'
import {
    SetEntitiesAction,
    AppendColumnAction,
    SetErrorAction,
    SetEntityLoadingAction,
    SetColumnLoadingAction,
    TableAction
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
        const col_idx = state.columnIndices[action.idPersistent]
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
            state.columnIndices[action.idPersistent] ?? state.columnStates.length
        return new TableState({
            ...state,
            columnIndices: {
                ...state.columnIndices,
                [action.idPersistent]: column_idx
            },
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
