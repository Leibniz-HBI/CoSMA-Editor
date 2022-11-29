import { TableState } from './state'
import {
    SetTableAction,
    SetErrorAction,
    SetLoadingAction,
    TableAction
} from './actions'

export function tableReducer(state: TableState, action: TableAction) {
    if (action instanceof SetLoadingAction) {
        return new TableState({
            columns: state.columns,
            isLoading: true,
            errorMsg: undefined,
            row_objects: state.row_objects
        })
    } else if (action instanceof SetTableAction) {
        return new TableState({
            ...state,
            isLoading: false,
            row_objects: action.row_objects,
            errorMsg: undefined
        })
    } else if (action instanceof SetErrorAction) {
        return new TableState({
            columns: state.columns,
            isLoading: false,
            errorMsg: action.msg,
            row_objects: undefined
        })
    }
    return state
}
