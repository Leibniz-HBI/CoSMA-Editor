import { TagDefinition } from '../../column_menu/state'
import { parseColumnDefinitionsFromApi } from '../../column_menu/thunks'
import { config } from '../../config'
import { addError, newErrorState } from '../../util/error/slice'
import { errorMessageFromApi, exceptionMessage } from '../../util/exception'
import { ThunkWithFetch } from '../../util/type'
import {
    appendTagDefinition,
    getDisplayTxtTagDefinitionsError,
    getDisplayTxtTagDefinitionsStart,
    getDisplayTxtTagDefinitionsSuccess,
    removeTagDefinition
} from './slice'

export function getDisplayTxtTagDefinitions(): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getDisplayTxtTagDefinitionsStart())
        try {
            const rsp = await fetch(config.api_path + '/manage/display_txt/order', {
                credentials: 'include'
            })
            const json = await rsp.json()
            if (rsp.status != 200) {
                dispatch(addError(newErrorState(errorMessageFromApi(json))))
                dispatch(getDisplayTxtTagDefinitionsError())
            } else {
                const tagDefinitions = json['tag_definitions'].map(
                    (tagDefJson: unknown) => parseColumnDefinitionsFromApi(tagDefJson)
                )
                dispatch(getDisplayTxtTagDefinitionsSuccess(tagDefinitions))
            }
        } catch (e: unknown) {
            dispatch(addError(newErrorState(exceptionMessage(e))))
            dispatch(getDisplayTxtTagDefinitionsError())
        }
    }
}

export function appendTagDefinitionThunk(
    tagDefinition: TagDefinition
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            const rsp = await fetch(
                config.api_path + '/manage/display_txt/order/append',
                {
                    credentials: 'include',
                    body: JSON.stringify({
                        id_tag_definition_persistent: tagDefinition.idPersistent
                    }),
                    method: 'POST'
                }
            )
            if (rsp.status == 200) {
                dispatch(appendTagDefinition(tagDefinition))
            } else {
                const json = await rsp.json()
                dispatch(addError(newErrorState(errorMessageFromApi(json))))
            }
        } catch (e: unknown) {
            dispatch(addError(newErrorState(exceptionMessage(e))))
        }
    }
}

export function removeTagDefinitionThunk(
    tagDefinition: TagDefinition
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        try {
            const rsp = await fetch(
                config.api_path +
                    `/manage/display_txt/order/${tagDefinition.idPersistent}`,
                {
                    credentials: 'include',
                    method: 'DELETE'
                }
            )
            if (rsp.status == 200) {
                dispatch(removeTagDefinition(tagDefinition))
            } else {
                const json = await rsp.json()
                dispatch(addError(newErrorState(errorMessageFromApi(json))))
            }
        } catch (e: unknown) {
            dispatch(addError(newErrorState(exceptionMessage(e))))
        }
    }
}
