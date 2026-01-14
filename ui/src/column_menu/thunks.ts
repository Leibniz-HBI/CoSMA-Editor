import { addError, addSuccessVanish } from '../util/notification/slice'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { Column, ColumnType, newColumn } from './state'
import { JsonValue, ThunkWithFetch } from '../util/type'
import {
    changeParentSuccess,
    curateColumnSuccess,
    getColumnDetailsError,
    getColumnDetailsStart,
    getColumnDetailsSuccess,
    loadColumnHierarchyError,
    loadColumnHierarchyStart,
    loadColumnHierarchySuccess,
    submitColumnError,
    submitColumnStart,
    submitColumnSuccess
} from './slice'
import {
    parsePublicUserInfoFromJson,
    parsePublicUserInfoFromOpenApi
} from '../user/thunks'
import { PublicUserInfo } from '../user/state'
import { curateColumnError, curateColumnStart } from './slice'
import {
    cosmaeColumnApiPostGetColumnChildren,
    ColumnResponse,
    cosmaeColumnApiPostColumns,
    ColumnRequest,
    cosmaeColumnApiPostDetails,
    cosmaeColumnApiPurge,
    cosmaeColumnApiPermissionsPostCuration
} from '../openapi/cosmae'

export function loadColumnHierarchy({
    idParentPersistent = undefined,
    expand = false,
    indexPath = [],
    namePath = [],
    upUntilDate = undefined
}: {
    idParentPersistent?: string
    expand?: boolean
    indexPath?: number[]
    namePath?: string[]
    upUntilDate?: Date | undefined
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(loadColumnHierarchyStart(idParentPersistent))
        const columns: Column[] = []
        try {
            const body: { [key: string]: JsonValue } = {
                id_parent_persistent: idParentPersistent
            }
            if (upUntilDate !== undefined) {
                body['up_until_time'] = upUntilDate.toISOString()
            }
            const rsp = await cosmaeColumnApiPostGetColumnChildren({ body })
            if (rsp.error !== undefined) {
                dispatch(loadColumnHierarchyError())
                dispatch(
                    addError(
                        `Could not load column definitions. Reason: "${rsp.error.msg}"`
                    )
                )
                return
            }
            const columnsApi = rsp.data.column_list
            for (const columnApi of columnsApi) {
                const columnDefinition = parseColumnsFromApi(columnApi, namePath)
                columns.push(columnDefinition)
            }
            dispatch(
                loadColumnHierarchySuccess({
                    entries: columns,
                    path: indexPath,
                    forceExpand: expand,
                    upUntilSinceEpoch: upUntilDate?.getTime()
                })
            )
            const promises: Promise<void>[] = []
            columns.forEach(async (entry: Column, index: number) => {
                promises.push(
                    loadColumnHierarchy({
                        idParentPersistent: entry.idPersistent,
                        indexPath: [...indexPath, index],
                        namePath: entry.namePath,
                        expand: false,
                        upUntilDate
                    })(dispatch, _getState, fetch)
                )
            })
            await Promise.all(promises)

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            dispatch(loadColumnHierarchyError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function submitColumn({
    name,
    description,
    idParentPersistent,
    type,
    idPersistent,
    version,
    disabled,
    namePath,
    parentNamePath
}: {
    name: string
    description: string
    idParentPersistent?: string
    type: ColumnType
    idPersistent?: string
    version?: number
    disabled?: boolean
    namePath?: string[]
    parentNamePath: string[]
}): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(submitColumnStart())
        try {
            const rsp = await cosmaeColumnApiPostColumns({
                body: {
                    column_list: [
                        {
                            name: name,
                            id_parent_persistent: idParentPersistent,
                            type: type,
                            description,
                            id_persistent: idPersistent,
                            version: version,
                            disabled
                        }
                    ]
                }
            })
            if (rsp.data) {
                const column = parseColumnsFromApi(rsp.data.column_list[0])
                dispatch(
                    submitColumnSuccess({
                        parentNamePath,
                        column,
                        namePath
                    })
                )
                return true
            }

            dispatch(submitColumnError())
            dispatch(addError(errorMessageFromApi(rsp.error)))

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            dispatch(submitColumnError())
            dispatch(
                addError(
                    'Submitting the column definition failed: ' + exceptionMessage(e)
                )
            )
        }
        return false
    }
}
export function changeColumnParent({
    column,
    idParentNewPersistent,
    oldPathToColumn,
    pathToNewParent
}: {
    column: Column
    idParentNewPersistent: string | undefined
    oldPathToColumn: number[]
    pathToNewParent: number[]
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        const idParentRequestPersistent =
            idParentNewPersistent == '' ? undefined : idParentNewPersistent
        try {
            const payload = {
                id_persistent: column.idPersistent,
                name: column.namePath.at(-1),
                id_parent_persistent: idParentRequestPersistent,
                type: columnTypeMapAppToApi.get(column.columnType),
                version: column.version
            }
            const rsp = await cosmaeColumnApiPostColumns({
                body: { column_list: [payload as ColumnRequest] }
            })
            if (rsp.data) {
                const columnRsp = parseColumnsFromApi(rsp.data.column_list[0])
                dispatch(
                    changeParentSuccess({
                        column: columnRsp,
                        oldPathToColumn: oldPathToColumn,
                        pathToNewParent
                    })
                )
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
export function getColumnDetailsThunk(
    idPersistentList: string[],
    upUntilDate: Date | undefined = undefined
): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        if (idPersistentList.length == 0) {
            return
        }
        dispatch(
            getColumnDetailsStart({
                idPersistentList,
                upUntilSinceEpoch: upUntilDate?.getTime()
            })
        )
        try {
            const body: { [key: string]: JsonValue } = {
                id_persistent_list: idPersistentList
            }
            if (upUntilDate !== undefined) {
                body['up_until_time'] = upUntilDate.toISOString()
            }
            const rsp = await cosmaeColumnApiPostDetails({
                body: {
                    id_persistent_list: idPersistentList,
                    up_until_time: upUntilDate?.toISOString()
                }
            })
            if (rsp.data) {
                const requestedIdSet = new Set<string>(idPersistentList)
                const columnList: Column[] = []
                rsp.data.column_list.forEach((json: unknown) => {
                    const column = parseColumnsFromApi(json)
                    requestedIdSet.delete(column.idPersistent)
                    columnList.push(column)
                })
                requestedIdSet.forEach((idPersistent: string) => {
                    columnList.push(
                        newColumn({
                            idPersistent,
                            namePath: ['Does not exist in version'],
                            columnType: ColumnType.String,
                            curated: false,
                            disabled: true,
                            hidden: true,
                            version: -1
                        })
                    )
                })
                dispatch(
                    getColumnDetailsSuccess({
                        columnList,
                        upUntilSinceEpoch: upUntilDate?.getTime()
                    })
                )
            } else {
                dispatch(
                    getColumnDetailsError({
                        idPersistentList,
                        upUntilSinceEpoch: upUntilDate?.getTime()
                    })
                )
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(
                getColumnDetailsError({
                    idPersistentList,
                    upUntilSinceEpoch: upUntilDate?.getTime()
                })
            )
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
export function purgeColumn(column: Column): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(submitColumnStart())
        try {
            const rsp = await cosmaeColumnApiPurge({
                path: { id_persistent: column.idPersistent }
            })
            if (rsp.data) {
                dispatch(
                    submitColumnSuccess({
                        column: { ...column, disabled: true },
                        namePath: column.namePath,
                        parentNamePath: column.namePath.slice(0, -1)
                    })
                )
                dispatch(addSuccessVanish('Successfully purged column definition.'))
            } else {
                dispatch(submitColumnError())
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(submitColumnError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function curateAsync(idColumnPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(curateColumnStart())
        try {
            const rsp = await cosmaeColumnApiPermissionsPostCuration({
                path: { id_column_persistent: idColumnPersistent }
            })
            if (rsp.data) {
                dispatch(curateColumnSuccess(idColumnPersistent))
            } else {
                dispatch(curateColumnError())
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(curateColumnError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export const columnTypeMapApiToApp = new Map<string, ColumnType>([
    ['INNER', ColumnType.Inner],
    ['STRING', ColumnType.String],
    ['FLOAT', ColumnType.Float],
    ['BOOL', ColumnType.Boolean]
])

export const columnTypeIdxToApi = ['STRING', 'FLOAT', 'INNER']

export function parseColumnsFromApi(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columnApi: any,
    parentNamePath?: string[]
): Column {
    const columnType = columnTypeMapApiToApp.get(columnApi['type']) ?? ColumnType.String
    let namePath
    if (parentNamePath === undefined) {
        namePath = columnApi['name_path']
    } else {
        namePath = [...parentNamePath, columnApi['name']]
    }
    let owner: PublicUserInfo | undefined = undefined
    const ownerJson = columnApi['owner']
    if (ownerJson !== undefined && ownerJson !== null) {
        owner = parsePublicUserInfoFromJson(ownerJson)
    }
    return newColumn({
        idPersistent: columnApi['id_persistent'],
        idParentPersistent: columnApi['id_parent_persistent'] ?? undefined,
        namePath,
        version: columnApi['version'],
        curated: columnApi['curated'],
        columnType: columnType,
        owner: owner,
        description: columnApi['description'],
        hidden: columnApi['hidden'],
        disabled: columnApi['disabled']
    })
}
export function parseColumnsFromOpenApi(
    columnApi: ColumnResponse,
    parentNamePath?: string | undefined
): Column {
    const columnType = columnTypeMapApiToApp.get(columnApi.type) ?? ColumnType.String
    let namePath = []
    if (parentNamePath === undefined) {
        namePath = columnApi.name_path
    } else {
        namePath = [...parentNamePath, columnApi.name_path.at(-1) ?? '???']
    }
    let owner: PublicUserInfo | undefined = undefined
    const ownerJson = columnApi.owner
    if (ownerJson !== undefined && ownerJson !== null) {
        owner = parsePublicUserInfoFromOpenApi(ownerJson)
    }
    return newColumn({
        idPersistent: columnApi.id_persistent,
        idParentPersistent: columnApi.id_parent_persistent ?? undefined,
        namePath,
        version: columnApi['version'],
        curated: columnApi['curated'],
        columnType: columnType,
        owner: owner,
        description: columnApi['description'] ?? undefined,
        hidden: columnApi['hidden'],
        disabled: columnApi['disabled']
    })
}

export const columnTypeMapAppToApi = new Map<ColumnType, string>([
    [ColumnType.Inner, 'INNER'],
    [ColumnType.String, 'STRING'],
    [ColumnType.Float, 'FLOAT'],
    [ColumnType.Boolean, 'BOOL']
])

export function columnToApi(column: Column) {
    return {
        id_persistent: column.idPersistent,
        name: column.namePath.at(-1),
        id_parent_persistent: column.idParentPersistent,
        type: columnTypeMapAppToApi.get(column.columnType),
        version: column.version,
        curated: column.curated,
        owner: column.owner,
        hidden: column.hidden,
        disabled: column.disabled
    }
}
