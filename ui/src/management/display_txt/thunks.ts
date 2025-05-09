import { Column } from '../../column_menu/state'
import { parseColumnsFromApi } from '../../column_menu/thunks'
import { config } from '../../config'
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

export function getDisplayTxtColumns(): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getDisplayTxtColumnsStart())
        try {
            const rsp = await fetch(config.api_path + '/manage/display_txt/order', {
                credentials: 'include'
            })
            const json = await rsp.json()
            if (rsp.status != 200) {
                dispatch(addError(errorMessageFromApi(json)))
                dispatch(getDisplayTxtColumnsError())
            } else {
                const columnList = json['column_list'].map((columnJson: unknown) =>
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
    return async (dispatch, _getState, fetch) => {
        try {
            const rsp = await fetch(
                config.api_path + '/manage/display_txt/order/append',
                {
                    credentials: 'include',
                    body: JSON.stringify({
                        id_column_persistent: column.idPersistent
                    }),
                    method: 'POST'
                }
            )
            if (rsp.status == 200) {
                dispatch(appendColumn(column))
            } else {
                const json = await rsp.json()
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function removeColumnThunk(column: Column): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            const rsp = await fetch(
                config.api_path +
                    `/manage/display_txt/order/${column.idPersistent}`,
                {
                    credentials: 'include',
                    method: 'DELETE'
                }
            )
            if (rsp.status == 200) {
                dispatch(removeColumn(column))
            } else {
                const json = await rsp.json()
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
