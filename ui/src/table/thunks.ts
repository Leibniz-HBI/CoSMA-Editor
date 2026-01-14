import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { Column, ColumnType } from '../column_menu/state'
import {
    CellValue,
    displayTxtColumnId,
    FilterClause,
    FilterOperator,
    isFilterComposite,
    isFilterLiteral,
    isFilterNegation
} from './state'
import { Entity } from '../entity/state'
import { newEntity } from '../entity/state'
import { config } from '../config'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { parseColumnsFromApi } from '../column_menu/thunks'
import { JsonValue, ThunkWithFetch } from '../util/type'
import {
    FilterClause as FilterClauseApi,
    ValueUpdatedResponse
} from '../openapi/cosmae/types.gen'
import {
    cosmaeColumnApiGetDescendants,
    cosmaeEntityApiEntitiesPost,
    cosmaeEntityApiFilterEntities,
    cosmaeEntityApiGetJustifications,
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
    submitValuesError,
    submitValuesStart,
    submitValuesSuccess
} from './slice'
import { parseCommentFromApi } from '../comments/thunks'
import { getEntitySuccess } from '../entity/slice'

/**
 * Async action for fetching table data.
 */
export function getTableAsync(
    upUntilTime: Date | undefined = undefined,
    filter: FilterClause | undefined = undefined
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(setEntityLoading())
        dispatch(setColumnLoading(displayTxtColumnId))
        try {
            const body: { [key: string]: JsonValue } = {}
            if (upUntilTime !== undefined) {
                body['up_until_time'] = upUntilTime.toISOString()
            }
            if (filter !== undefined) {
                body['filter'] = filterToApi(filter)
            }
            const idEntityPersistentList: string[] = []
            for (let offset = 0; ; ) {
                const rsp = await cosmaeEntityApiFilterEntities({
                    body: { ...body, offset, limit: 1000 }
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
                if (rsp.data.id_entity_persistent_list.length == 0) {
                    break
                }
                idEntityPersistentList.push(...rsp.data.id_entity_persistent_list)
                offset = rsp.data.next_offset
            }
            dispatch(setEntities(idEntityPersistentList))
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
    return async (dispatch, _getState, _fetch) => {
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
    return async (dispatch, _getState, _fetch) => {
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
    return async (dispatch, _getState, _fetch) => {
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
                const entityJson = rsp.data.entity_list[0]
                const entity = parseEntityObjectFromJson(entityJson)
                dispatch(getEntitySuccess({ entity, upUntilSinceEpoch: undefined }))
                dispatch(entityChangeOrCreateSuccess(entity.idPersistent))
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
    return async (dispatch, _getState, _fetch) => {
        dispatch(loadEntityJustificationHistoryStart())
        try {
            const rsp = await cosmaeEntityApiGetJustifications({
                path: { id_entity_persistent: idEntityPersistent },
                query: { up_until_time: upUntilTime?.toISOString() }
            })
            if (rsp.data) {
                const justifications = rsp.data.justifications.map(
                    (justification) => parseCommentFromApi(justification)
                )
                dispatch(loadEntityJustificationHistorySuccess(justifications))
            } else {
                dispatch(loadEntityJustificationHistoryError())
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(loadEntityJustificationHistoryError())
            dispatch(addError(exceptionMessage(e)))
        }
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

function filterToApi(filter: FilterClause): FilterClauseApi {
    const todoStack: (FilterClause | FilterOperator | 'NOT')[] = [filter]
    const doneStack: FilterClauseApi[][] = [[]]
    while (todoStack.length > 0) {
        const current = todoStack.pop()
        if (current === undefined) {
            continue
        }
        if (typeof current === 'string') {
            const parts = doneStack.pop()
            if (
                parts === undefined ||
                (current !== 'AND' && current !== 'OR' && current !== 'NOT')
            ) {
                throw new Error('Internal error in filter conversion.')
            }
            if (current === 'NOT') {
                doneStack.at(-1)?.push({
                    filter: {
                        type: 'NEGATION',
                        clause: parts[0]
                    }
                })
            } else {
                doneStack.at(-1)?.push({
                    filter: {
                        type: 'COMPOSITE',
                        operator: current,
                        clause_list: parts
                    }
                })
            }
        } else if (isFilterLiteral(current)) {
            doneStack.at(-1)?.push({
                filter: {
                    type: 'LITERAL',
                    id_column_persistent: current.idColumnPersistent,
                    predicate: current.predicate,
                    value: current.value
                }
            })
        } else if (isFilterComposite(current)) {
            todoStack.push(current.operator)
            todoStack.push(...current.clause_list)
            doneStack.push([])
        } else if (isFilterNegation(current)) {
            todoStack.push('NOT')
            todoStack.push(current.clause)
            doneStack.push([])
        }
    }
    return doneStack[0][0]
}
