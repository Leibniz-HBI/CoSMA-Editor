import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { fetch_chunk } from '../util/fetch'
import { Column, ColumnType } from '../column_menu/state'
import { CellValue, displayTxtColumnId, justificationColumnId } from './state'
import { Entity } from '../entity/state'
import { newEntity } from '../entity/state'
import { config } from '../config'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { constructColumnTitle } from '../contribution/entity/hooks'
import { parseColumnsFromApi } from '../column_menu/thunks'
import { ThunkWithFetch } from '../util/type'
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
export function getTableAsync(): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, fetch) => {
        dispatch(setEntityLoading())
        dispatch(setColumnLoading(displayTxtColumnId))
        try {
            const entities: Entity[] = []
            for (let i = 0; ; i += 500) {
                const rsp = await fetch_chunk({
                    api_path: config.api_path + '/entities/chunk',
                    offset: i,
                    limit: 500,
                    fetchMethod: fetch
                })
                if (rsp.status == 404) {
                    dispatch(setEntities([]))
                    return false
                } else if (rsp.status !== 200) {
                    const json = await rsp.json()
                    dispatch(setLoadDataError())
                    dispatch(
                        addError(
                            `Could not load entities chunk ${i}. Reason: "${json['msg']}"`
                        )
                    )
                    return false
                }
                const json = await rsp.json()
                const rowsApi = json['entity_list']
                if (rowsApi !== null) {
                    for (const entry_json of rowsApi) {
                        const entity = parseEntityObjectFromJson(entry_json)
                        entities.push(entity)
                    }
                }
                if (rowsApi.length < 500) {
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
            return true
        } catch (e: unknown) {
            dispatch(setLoadDataError())
            dispatch(addError(exceptionMessage(e)))
        }
        return false
    }
}

export function getColumnAsync(
    columnDefinition: Column
): ThunkWithFetch<string[]> {
    return async (dispatch, _getState, fetch) => {
        const id_persistent = columnDefinition.idPersistent
        if (id_persistent == justificationColumnId) {
            dispatch(showEntityJustification())
            return []
        }
        let idPersistentList = [columnDefinition.idPersistent]
        if (columnDefinition.columnType === ColumnType.Inner) {
            try {
                const rsp = await fetch(
                    config.api_path +
                        `/columns/${columnDefinition.idPersistent}/descendants`,
                    { credentials: 'include' }
                )
                const json = await rsp.json()
                if (rsp.status == 200) {
                    idPersistentList = json['id_descendants_persistent_list']
                } else {
                    dispatch(addError(errorMessageFromApi(json)))
                    return []
                }
            } catch (_e: unknown) {
                dispatch(addError('Could not fetch descendant columns.'))
                return []
            } finally {
                dispatch(removeColumnByIdPersistent(columnDefinition.idPersistent))
            }
        }
        const successList = []
        for (const idPersistent of idPersistentList) {
            dispatch(setColumnLoading(idPersistent))
            try {
                const column_data: { [key: string]: CellValue[] } = {}
                let offset = 0
                for (let i = 0; ; i += 5000) {
                    const rsp = await fetch_chunk({
                        api_path: config.api_path + '/values/chunk',
                        offset,
                        limit: 5000,
                        payload: {
                            id_column_persistent: idPersistent
                        },
                        fetchMethod: fetch
                    })
                    if (rsp.status !== 200) {
                        dispatch(setLoadDataError())
                        dispatch(
                            addError(
                                `Could not load instances chunk ${i}. Reason: "${
                                    (await rsp.json())['msg']
                                }"`
                            )
                        )
                        return []
                    }
                    const json = await rsp.json()
                    const columns = json['value_list']
                    for (const column of columns) {
                        const id_entity_persistent: string = column['id_entity_persistent']
                        const valueString = column['value']
                        const valueIdPersistent = column['id_persistent']
                        const valueVersion = Number.parseInt(column['version'])
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
                            Math.max(
                                ...columns.map(
                                    (columnJson: { [key: string]: unknown }) =>
                                        columnJson['version']
                                )
                            ) + 1
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
            const rsp = await fetch(config.api_path + '/values', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    value_list: [
                        {
                            id_entity_persistent: edit[0],
                            id_column_persistent: edit[1],
                            value: edit[2].value,
                            id_persistent: edit[2].idPersistent,
                            version: edit[2].version
                        }
                    ]
                })
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const value = json['value_list'][0]

                dispatch(
                    submitValuesSuccess([extractEdit(edit, columnType, value)])
                )
                return
            }
            if (rsp.status == 409) {
                const value = json['value_list'][0]
                dispatch(
                    submitValuesSuccess([extractEdit(edit, columnType, value)])
                )
                dispatch(submitValuesError())
                dispatch(
                    addError(
                        'The data you entered changed in the remote location. ' +
                            'The new values are updated in the table. Please review them.'
                    )
                )
                return
            }
            if (rsp.status == 403) {
                const namePath = constructColumnTitle(
                    json['name_path'] ?? json['name'] ?? ['UNKNOWN']
                )
                dispatch(submitValuesError())
                dispatch(
                    addError(
                        `You do not have sufficient permissions to change values for column ${namePath}`
                    )
                )
                return
            }
            dispatch(submitValuesError())
            dispatch(addError(errorMessageFromApi(json)))
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
            const rsp = await fetch(config.api_path + '/entities', {
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({
                    entity_list: [
                        {
                            display_txt: displayTxt,
                            justification_txt: justificationTxt,
                            id_persistent: idPersistent,
                            version: version
                        }
                    ]
                })
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const entity = json['entity_list'][0]
                dispatch(entityChangeOrCreateSuccess(parseEntityObjectFromJson(entity)))
                if (idPersistent === undefined) {
                    dispatch(addSuccessVanish('Entity created.'))
                }
            } else {
                dispatch(entityChangeOrCreateError())
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(entityChangeOrCreateError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function loadEntityJustificationHistoryThunk(
    idEntityPersistent: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(loadEntityJustificationHistoryStart())
        try {
            const rsp = await fetch(
                config.api_path + `/entities/${idEntityPersistent}/justifications`,
                { credentials: 'include' }
            )
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
