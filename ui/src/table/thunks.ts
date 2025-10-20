import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { Column, ColumnType } from '../column_menu/state'
import { CellValue, displayTxtColumnId } from './state'
import { Entity } from '../entity/state'
import { newEntity } from '../entity/state'
import { config } from '../config'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { parseColumnsFromApi } from '../column_menu/thunks'
import { JsonValue, ThunkWithFetch } from '../util/type'
import { ValueUpdatedResponse } from '../openapi/cosmae/types.gen'
import {
    cosmaeColumnApiGetDescendants,
    cosmaeEntityApiEntitiesChunksPost,
    cosmaeEntityApiEntitiesPost,
    cosmaeValueApiPostValue,
    cosmaeValueApiPostValueChunks
} from '../openapi/cosmae/sdk.gen'
import {
    Edit,
    appendColumn,
    entityChangeOrCreateError,
    entityChangeOrCreateStart,
    entityChangeOrCreateSuccess,
    loadEntityJustificationHistoryError,
    loadEntityJustificationHistoryStart,
    loadEntityJustificationHistorySuccess,
    removeColumnByIdPersistent,
    setColumnLoading,
    setEntities,
    setEntityLoading,
    setLoadDataError,
    showEntityJustification,
    submitEntityJustificationError,
    submitEntityJustificationStart,
    submitEntityJustificationSuccess,
    submitValuesError,
    submitValuesStart,
    submitValuesSuccess
} from './slice'
import { parseCommentFromApi } from '../comments/thunks'

/**
 * Async action for fetching table data.
 */
export function getTableAsync(
    upUntilTime: Date | undefined = undefined
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(setEntityLoading())
        dispatch(setColumnLoading(displayTxtColumnId))
        try {
            const payload: { [key: string]: JsonValue } = {}
            if (upUntilTime !== undefined) {
                payload['up_until_time'] = upUntilTime.toISOString()
            }
            const entities: Entity[] = []
            for (let offset = 0; ; ) {
                const rsp = await cosmaeEntityApiEntitiesChunksPost({
                    body: { ...payload, offset, limit: 500 }
                })
                if (rsp.response.status == 404) {
                    dispatch(setEntities([]))
                    return false
                } else if (rsp.data === undefined) {
                    dispatch(setLoadDataError())
                    dispatch(
                        addError(
                            `Could not load entities chunk with offset ${offset}. Reason: "${rsp.error.msg}"`
                        )
                    )
                    return false
                }
                const rowsApi = rsp.data.entity_list
                if (rowsApi !== null) {
                    for (const entry_json of rowsApi) {
                        const entity = parseEntityObjectFromJson(entry_json)
                        entities.push(entity)
                    }
                }
                offset = rsp.data.next_offset
                if (offset <= 0) {
                    break
                }
            }
            dispatch(setEntities(entities))
            dispatch(
                appendColumn({
                    idPersistent: displayTxtColumnId,
                    columnData: undefined
                })
            )
            dispatch(showEntityJustification())
            return true
        } catch (e: unknown) {
            dispatch(setLoadDataError())
            dispatch(addError(exceptionMessage(e)))
        }
        return false
    }
}

export function getColumnAsync(
    idPersistent: string,
    upUntilTime: Date | undefined = undefined,
    columnType: ColumnType | undefined = undefined
): ThunkWithFetch<string[]> {
    return async (dispatch, _getState, fetch) => {
        let idPersistentList = [idPersistent]
        if (columnType === ColumnType.Inner) {
            try {
                const descendantsRsp = await cosmaeColumnApiGetDescendants({
                    path: { id_persistent: idPersistent },
                    query: { up_until_time: upUntilTime?.toISOString() }
                })
                if (descendantsRsp.data !== undefined) {
                    idPersistentList =
                        descendantsRsp.data.id_descendants_persistent_list
                } else {
                    dispatch(addError(errorMessageFromApi(descendantsRsp.error)))
                    return []
                }
            } catch (_e: unknown) {
                dispatch(addError('Could not fetch descendant columns.'))
                return []
            } finally {
                dispatch(removeColumnByIdPersistent(idPersistent))
            }
        }
        const successList = []
        for (const idPersistent of idPersistentList) {
            dispatch(setColumnLoading(idPersistent))
            const payload: { [key: string]: JsonValue } = {
                id_column_persistent: idPersistent
            }
            if (upUntilTime !== undefined) {
                payload['up_until_time'] = upUntilTime.toISOString()
            }
            try {
                const column_data: { [key: string]: CellValue[] } = {}
                let offset = 0
                for (let i = 0; ; i += 5000) {
                    const rsp = await cosmaeValueApiPostValueChunks({
                        body: {
                            up_until_time: upUntilTime?.toISOString(),
                            id_column_persistent: idPersistent,
                            offset,
                            limit: 5000
                        }
                    })
                    if (rsp.data === undefined) {
                        dispatch(setLoadDataError())
                        dispatch(
                            addError(
                                `Could not load instances chunk ${i}. Reason: "${rsp.error.msg}"`
                            )
                        )
                        return []
                    }
                    const columns = rsp.data.value_list
                    for (const column of columns) {
                        const id_entity_persistent: string =
                            column['id_entity_persistent']
                        const valueString = column.value ?? ''
                        const valueIdPersistent = column.id_persistent ?? ''
                        const valueVersion = column.version ?? 0
                        const versionedValue = {
                            value: valueString,
                            idPersistent: valueIdPersistent,
                            version: valueVersion
                        }
                        column_data[id_entity_persistent] = [versionedValue]
                    }
                    if (columns.length < 5000) {
                        break
                    } else {
                        offset =
                            Math.max(...columns.map((column) => column.version ?? 0)) +
                            1
                    }
                }
                dispatch(
                    appendColumn({
                        idPersistent: idPersistent,
                        columnData: column_data
                    })
                )
                successList.push(idPersistent)
            } catch (e: unknown) {
                dispatch(setLoadDataError())
                dispatch(addError(exceptionMessage(e)))
            }
        }
        return successList
    }
}

export function submitValuesAsync(
    columnType: ColumnType,
    edit: Edit
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(submitValuesStart())
        try {
            const rsp = await cosmaeValueApiPostValue({
                body: {
                    value_list: [
                        {
                            id_entity_persistent: edit[0],
                            id_column_persistent: edit[1],
                            value: edit[2].value?.toString(),
                            id_persistent: edit[2].idPersistent,
                            version: edit[2].version
                        }
                    ]
                }
            })
            if (rsp.data !== undefined) {
                const value = rsp.data.value_list[0]

                dispatch(submitValuesSuccess([extractEdit(edit, columnType, value)]))
                return
            }
            const status = rsp.response.status
            if (status == 409) {
                const value = (rsp.error as ValueUpdatedResponse).value_list[0]
                dispatch(submitValuesSuccess([extractEdit(edit, columnType, value)]))
                dispatch(submitValuesError())
                dispatch(
                    addError(
                        'The data you entered changed in the remote location. ' +
                            'The new values are updated in the table. Please review them.'
                    )
                )
                return
            }
            if (status == 403) {
                dispatch(submitValuesError())
                dispatch(
                    addError(
                        `You do not have sufficient permissions to change values for column`
                    )
                )
                return
            }
            dispatch(submitValuesError())
            dispatch(addError(errorMessageFromApi(rsp.error)))
        } catch (e: unknown) {
            dispatch(submitValuesError())
            dispatch(addError('Unknown error: ' + exceptionMessage(e)))
        }
    }
}
function extractEdit(
    edit: Edit,
    columnType: ColumnType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: { [key: string]: any }
): Edit {
    return [
        edit[0],
        edit[1],
        {
            value: parseValue(columnType, value['value']),
            version: value['version'],
            idPersistent: value['id_persistent']
        }
    ]
}

export function entityChangeOrCreate({
    displayTxt,
    idPersistent = undefined,
    justificationTxt = undefined,
    version = undefined
}: {
    displayTxt?: string
    idPersistent?: string
    justificationTxt?: string
    version?: number
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(entityChangeOrCreateStart())
        try {
            const rsp = await cosmaeEntityApiEntitiesPost({
                body: {
                    entity_list: [
                        {
                            display_txt: displayTxt,
                            justification_txt: justificationTxt,
                            id_persistent: idPersistent,
                            version: version
                        }
                    ]
                }
            })
            if (rsp.data !== undefined) {
                const entity = rsp.data.entity_list[0]
                dispatch(entityChangeOrCreateSuccess(parseEntityObjectFromJson(entity)))
                if (idPersistent === undefined) {
                    dispatch(addSuccessVanish('Entity created.'))
                }
            } else {
                dispatch(entityChangeOrCreateError())
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(entityChangeOrCreateError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function loadEntityJustificationHistoryThunk(
    idEntityPersistent: string,
    upUntilTime: Date | undefined = undefined
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(loadEntityJustificationHistoryStart())
        try {
            let queryPath = `/entities/${idEntityPersistent}/justifications?`
            if (upUntilTime !== undefined) {
                queryPath += new URLSearchParams({
                    up_until_time: upUntilTime.toISOString()
                })
            }
            const rsp = await fetch(config.api_path + queryPath, {
                credentials: 'include'
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const justifications = json['justifications'].map(
                    (justification: unknown) => parseCommentFromApi(justification)
                )
                dispatch(loadEntityJustificationHistorySuccess(justifications))
            } else {
                dispatch(loadEntityJustificationHistoryError())
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(loadEntityJustificationHistoryError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function submitEntityJustificationThunk(
    idEntityPersistent: string,
    justification: string
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, fetch) => {
        dispatch(submitEntityJustificationStart())
        try {
            const rsp = await fetch(
                config.api_path + `/entities/${idEntityPersistent}/justifications`,
                {
                    credentials: 'include',
                    method: 'PUT',
                    body: JSON.stringify({ justification_txt: justification })
                }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const comment = parseCommentFromApi(json['justification'])
                dispatch(
                    submitEntityJustificationSuccess({ idEntityPersistent, comment })
                )
                return true
            } else if (rsp.status == 302) {
                dispatch(addSuccessVanish('A similar justification already exists.'))
                dispatch(submitEntityJustificationSuccess(undefined))
                return true
            } else {
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
        dispatch(submitEntityJustificationError())
        return false
    }
}

export function parseValue(
    columnType: ColumnType,
    valueString: string
): number | boolean | string | undefined {
    try {
        if (columnType === ColumnType.Float) {
            return Number.parseFloat(valueString)
        }
        if (columnType === ColumnType.Inner) {
            return valueString.toLowerCase() == 'true'
        }
        return valueString
    } catch (_e: unknown) {
        return undefined
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEntityObjectFromJson(json: any): Entity {
    return newEntity({
        idPersistent: json['id_persistent'],
        displayTxt: json['display_txt'] ?? undefined,
        displayTxtDetails: parseDisplayTxtDetails(json['display_txt_details']),
        version: Number.parseInt(json['version']),
        disabled: json['disabled'],
        justificationTxt: json['justification_txt'] ?? undefined
    })
}
export function parseDisplayTxtDetails(
    arg: { [key: string]: unknown } | string
): string | Column | undefined {
    if (arg === null) {
        return undefined
    }
    if (typeof arg == 'string') {
        return arg
    }
    return parseColumnsFromApi(arg)
}
