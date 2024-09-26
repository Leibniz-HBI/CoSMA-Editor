import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { fetch_chunk } from '../util/fetch'
import { TagDefinition, TagType } from '../column_menu/state'
import {
    CellValue,
    Entity,
    displayTextColumn,
    displayTxtColumnId,
    newEntity,
    justificationColumnId
} from './state'
import { config } from '../config'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { constructColumnTitle } from '../contribution/entity/hooks'
import { parseColumnDefinitionsFromApi } from '../column_menu/thunks'
import { ThunkWithFetch } from '../util/type'
import {
    Edit,
    appendColumn,
    curateTagDefinitionError,
    curateTagDefinitionStart,
    entityChangeOrCreateError,
    entityChangeOrCreateStart,
    entityChangeOrCreateSuccess,
    loadEntityJustificationHistoryError,
    loadEntityJustificationHistoryStart,
    loadEntityJustificationHistorySuccess,
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
    submitValuesSuccess,
    tagDefinitionChange
} from './slice'
import { parseCommentFromApi } from '../comments/thunks'

/**
 * Async action for fetching table data.
 */
export function getTableAsync(): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, fetch) => {
        dispatch(setEntityLoading())
        dispatch(setColumnLoading(displayTextColumn))
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

export function getColumnAsync(columnDefinition: TagDefinition): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        const id_persistent = columnDefinition.idPersistent
        if (id_persistent == justificationColumnId) {
            dispatch(showEntityJustification())
            return
        }
        try {
            dispatch(setColumnLoading(columnDefinition))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const column_data: { [key: string]: CellValue[] } = {}
            let offset = 0
            for (let i = 0; ; i += 5000) {
                const rsp = await fetch_chunk({
                    api_path: config.api_path + '/tags/chunk',
                    offset,
                    limit: 5000,
                    payload: {
                        id_tag_definition_persistent: id_persistent
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
                    return
                }
                const json = await rsp.json()
                const tags = json['tag_instances']
                for (const tag of tags) {
                    const id_entity_persistent: string = tag['id_entity_persistent']
                    const valueString = tag['value']
                    const valueIdPersistent = tag['id_persistent']
                    const valueVersion = Number.parseInt(tag['version'])
                    const parsedValue = parseValue(
                        columnDefinition.columnType,
                        valueString
                    )
                    const versionedValue = {
                        value: parsedValue,
                        idPersistent: valueIdPersistent,
                        version: valueVersion
                    }
                    column_data[id_entity_persistent] = [versionedValue]
                }
                if (tags.length < 5000) {
                    break
                } else {
                    offset =
                        Math.max(
                            ...tags.map(
                                (tagJson: { [key: string]: unknown }) =>
                                    tagJson['version']
                            )
                        ) + 1
                }
            }
            dispatch(
                appendColumn({ idPersistent: id_persistent, columnData: column_data })
            )
        } catch (e: unknown) {
            dispatch(setLoadDataError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function submitValuesAsync(
    columnType: TagType,
    edit: Edit
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(submitValuesStart())
        try {
            const rsp = await fetch(config.api_path + '/tags', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tag_instances: [
                        {
                            id_entity_persistent: edit[0],
                            id_tag_definition_persistent: edit[1],
                            value: edit[2].value,
                            id_persistent: edit[2].idPersistent,
                            version: edit[2].version
                        }
                    ]
                })
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const tagInstance = json['tag_instances'][0]

                dispatch(
                    submitValuesSuccess([extractEdit(edit, columnType, tagInstance)])
                )
                return
            }
            if (rsp.status == 409) {
                const tagInstance = json['tag_instances'][0]
                dispatch(
                    submitValuesSuccess([extractEdit(edit, columnType, tagInstance)])
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
                        `You do not have sufficient permissions to change values for tag ${namePath}`
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
    columnType: TagType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tagInstance: { [key: string]: any }
): Edit {
    return [
        edit[0],
        edit[1],
        {
            value: parseValue(columnType, tagInstance['value']),
            version: tagInstance['version'],
            idPersistent: tagInstance['id_persistent']
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

export function curateAsync(idTagDefinitionPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(curateTagDefinitionStart())
        try {
            const rsp = await fetch(
                config.api_path +
                    `/tags/definitions/permissions/${idTagDefinitionPersistent}/curate`,
                {
                    credentials: 'include',
                    method: 'POST'
                }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(tagDefinitionChange(parseColumnDefinitionsFromApi(json)))
            } else {
                dispatch(curateTagDefinitionError())
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(curateTagDefinitionError())
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
    columnType: TagType,
    valueString: string
): number | boolean | string | undefined {
    try {
        if (columnType === TagType.Float) {
            return Number.parseFloat(valueString)
        }
        if (columnType === TagType.Inner) {
            return valueString.toLowerCase() == 'true'
        }
        return valueString
    } catch (e: unknown) {
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
): string | TagDefinition {
    if (typeof arg == 'string') {
        return arg
    }
    return parseColumnDefinitionsFromApi(arg)
}
