import { newErrorState } from '../util/error/slice'
import { exceptionMessage } from '../util/exception'
import {
    TagDefinition,
    TagSelectionEntry,
    TagType,
    newTagDefinition,
    newTagSelectionEntry
} from './state'
import { config } from '../config'
import { ThunkWithFetch } from '../util/type'
import {
    loadTagHierarchyError,
    loadTagHierarchyStart,
    loadTagHierarchySuccess,
    submitTagDefinitionError,
    submitTagDefinitionStart,
    submitTagDefinitionSuccess
} from './slice'

export function loadTagDefinitionHierarchy({
    idParentPersistent = undefined,
    expand = false,
    indexPath = [],
    namePath = []
}: {
    idParentPersistent?: string
    expand?: boolean
    indexPath?: number[]
    namePath?: string[]
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(loadTagHierarchyStart(indexPath))
        const columnSelectionEntries: TagSelectionEntry[] = []
        try {
            const rsp = await fetch(config.api_path + '/tags/definitions/children', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id_parent_persistent: idParentPersistent })
            })
            const json = await rsp.json()
            if (rsp.status != 200) {
                dispatch(
                    loadTagHierarchyError(
                        newErrorState(
                            `Could not load column definitions. Reason: "${json['msg']}"`
                        )
                    )
                )
                return
            }
            const tagDefinitionsApi = await json['tag_definitions']
            for (const tagDefinitionApi of tagDefinitionsApi) {
                const columnDefinition = parseColumnDefinitionsFromApi(
                    tagDefinitionApi,
                    namePath
                )
                columnSelectionEntries.push(
                    newTagSelectionEntry({
                        columnDefinition: columnDefinition,
                        isExpanded: expand
                    })
                )
            }
            dispatch(
                loadTagHierarchySuccess({
                    entries: columnSelectionEntries,
                    path: indexPath
                })
            )
            const promises: Promise<void>[] = []
            columnSelectionEntries.forEach(
                async (entry: TagSelectionEntry, index: number) => {
                    promises.push(
                        loadTagDefinitionHierarchy({
                            idParentPersistent: entry.columnDefinition.idPersistent,
                            indexPath: [...indexPath, index],
                            namePath: entry.columnDefinition.namePath,
                            expand: false
                        })(dispatch, _getState, fetch)
                    )
                }
            )
            await Promise.all(promises)

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            dispatch(loadTagHierarchyError(newErrorState(exceptionMessage(e))))
        }
    }
}

export function submitTagDefinition({
    name,
    idParentPersistent,
    columnTypeIdx
}: {
    name: string
    idParentPersistent?: string
    columnTypeIdx: number
}): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, fetch) => {
        dispatch(submitTagDefinitionStart())
        try {
            const rsp = await fetch(config.api_path + '/tags/definitions', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tag_definitions: [
                        {
                            name: name,
                            id_parent_persistent: idParentPersistent,
                            type: columnTypeIdxToApi[columnTypeIdx]
                        }
                    ]
                })
            })
            if (rsp.status == 200) {
                dispatch(submitTagDefinitionSuccess())
                return true
            }
            const msg = (await rsp.json())['msg']

            dispatch(submitTagDefinitionError(newErrorState(msg)))

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            dispatch(
                submitTagDefinitionError(
                    newErrorState(
                        'Submitting the column definition failed: ' +
                            exceptionMessage(e)
                    )
                )
            )
        }
        return false
    }
}

export const columnTypeMapApiToApp = new Map<string, TagType>([
    ['INNER', TagType.Inner],
    ['STRING', TagType.String],
    ['FLOAT', TagType.Float],
    ['BOOLEAN', TagType.Inner]
])

export const columnTypeIdxToApi = ['STRING', 'FLOAT', 'INNER']

export function parseColumnDefinitionsFromApi(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tagDefinitionApi: any,
    parentNamePath?: string[]
): TagDefinition {
    const columnType =
        columnTypeMapApiToApp.get(tagDefinitionApi['type']) ?? TagType.String
    let namePath
    if (parentNamePath === undefined) {
        namePath = tagDefinitionApi['name_path']
    } else {
        namePath = [...parentNamePath, tagDefinitionApi['name']]
    }
    return newTagDefinition({
        idPersistent: tagDefinitionApi['id_persistent'],
        idParentPersistent: tagDefinitionApi['id_parent_persistent'],
        namePath,
        version: tagDefinitionApi['version'],
        curated: tagDefinitionApi['curated'],
        columnType: columnType,
        owner: tagDefinitionApi['owner']
    })
}
