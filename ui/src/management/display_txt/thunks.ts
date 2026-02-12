import { Column } from '../../column_menu/state'
import { parseColumnsFromApi } from '../../column_menu/thunks'
import { addError } from '../../util/notification/slice'
import { errorMessageFromApi, exceptionMessage } from '../../util/exception'
import { ThunkWithFetch } from '../../util/type'
import {
    appendColumn,
    getDisplayTxtColumnsError,
    getDisplayTxtColumnsStart,
    getDisplayTxtColumnsSuccess,
    removeColumn
} from './slice'
import {
    cosmaeManagementDisplayTxtApiAppend,
    cosmaeManagementDisplayTxtApiGet,
    cosmaeManagementDisplayTxtApiRemove
} from '../../openapi/cosmae'

export function getDisplayTxtColumns(): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getDisplayTxtColumnsStart())
        try {
            const rsp = await cosmaeManagementDisplayTxtApiGet()
            if (rsp.error) {
                dispatch(addError(errorMessageFromApi(rsp.error)))
                dispatch(getDisplayTxtColumnsError())
            } else {
                const columnList = rsp.data.column_list.map((columnJson: unknown) =>
                    parseColumnsFromApi(columnJson)
                )
                dispatch(getDisplayTxtColumnsSuccess(columnList))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(getDisplayTxtColumnsError())
        }
    }
}

export function appendColumnThunk(column: Column): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            const rsp = await cosmaeManagementDisplayTxtApiAppend({
                body: { id_column_persistent: column.idPersistent }
            })
            if (rsp.data) {
                dispatch(appendColumn(column))
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function removeColumnThunk(column: Column): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        try {
            const rsp = await cosmaeManagementDisplayTxtApiRemove({
                path: {
                    id_column_persistent: column.idPersistent
                }
            })
            if (rsp.data) {
                dispatch(removeColumn(column))
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
