import { addError } from '../util/notification/slice'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { TagDefinition, TagSelectionEntry, TagType, newTagDefinition } from './state'
import { config } from '../config'
import { ThunkWithFetch } from '../util/type'
import {
    changeParentSuccess,
    loadTagHierarchyError,
    loadTagHierarchyStart,
    loadTagHierarchySuccess,
    submitTagDefinitionError,
    submitTagDefinitionStart,
    submitTagDefinitionSuccess
} from './slice'
import { parsePublicUserInfoFromJson } from '../user/thunks'
import { PublicUserInfo } from '../user/state'

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
        const tagDefinitions: TagDefinition[] = []
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
                dispatch(loadTagHierarchyError())
                dispatch(
                    addError(
                        `Could not load column definitions. Reason: "${json['msg']}"`
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
                tagDefinitions.push(columnDefinition)
            }
            dispatch(
                loadTagHierarchySuccess({
                    entries: tagDefinitions,
                    path: indexPath,
                    forceExpand: expand
                })
            )
            const promises: Promise<void>[] = []
            tagDefinitions.forEach(async (entry: TagDefinition, index: number) => {
                promises.push(
                    loadTagDefinitionHierarchy({
                        idParentPersistent: entry.idPersistent,
                        indexPath: [...indexPath, index],
                        namePath: entry.namePath,
                        expand: false
                    })(dispatch, _getState, fetch)
                )
            })
            await Promise.all(promises)

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            dispatch(loadTagHierarchyError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function submitTagDefinition({
    name,
    description,
    idParentPersistent,
    type,
    idPersistent,
    version,
    namePath,
    parentNamePath
}: {
    name: string
    description: string
    idParentPersistent?: string
    type: TagType
    idPersistent?: string
    version?: number
    namePath?: string[]
    parentNamePath: string[]
}): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, fetch) => {
        dispatch(submitTagDefinitionStart())
        try {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body: { [key: string]: any } = {
                name: name,
                id_parent_persistent: idParentPersistent,
                type: type,
                description
            }
            if (idPersistent !== undefined) {
                body.id_persistent = idPersistent
                body.version = version
            }
            const rsp = await fetch(config.api_path + '/tags/definitions', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tag_definitions: [body]
                })
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                const tagDefinition = parseColumnDefinitionsFromApi(
                    json['tag_definitions'][0]
                )
                dispatch(
                    submitTagDefinitionSuccess({
                        parentNamePath,
                        tagDefinition,
                        namePath
                    })
                )
                return true
            }
            const msg = (await rsp.json())['msg']

            dispatch(submitTagDefinitionError())
            dispatch(addError(msg))

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            dispatch(submitTagDefinitionError())
            dispatch(
                addError(
                    'Submitting the column definition failed: ' + exceptionMessage(e)
                )
            )
        }
        return false
    }
}
export function changeTagDefinitionParent({
    tagSelectionEntry,
    idParentPersistent,
    newPath,
    oldPath
}: {
    tagSelectionEntry: TagSelectionEntry
    idParentPersistent: string
    newPath: number[]
    oldPath: number[]
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        let idParentPersistentRequest: string | undefined = idParentPersistent
        if (idParentPersistentRequest === '') {
            idParentPersistentRequest = undefined
        }
        try {
            const tagDefinition = tagSelectionEntry.columnDefinition
            const payload = {
                id_persistent: tagDefinition.idPersistent,
                name: tagDefinition.namePath.at(-1),
                id_parent_persistent: idParentPersistentRequest,
                type: tagTypeMapAppToApi.get(tagDefinition.columnType),
                version: tagDefinition.version
            }
            const rsp = await fetch(config.api_path + '/tags/definitions', {
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({ tag_definitions: [payload] })
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                const tagDefinitionJson = json['tag_definitions'][0]
                const tagDefinition = parseColumnDefinitionsFromApi(tagDefinitionJson)
                dispatch(
                    changeParentSuccess({
                        newPath,
                        oldPath,
                        tagSelectionEntry: {
                            ...tagSelectionEntry,
                            columnDefinition: tagDefinition
                        }
                    })
                )
            } else {
                const json = await rsp.json()
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
        }
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
    let owner: PublicUserInfo | undefined = undefined
    const ownerJson = tagDefinitionApi['owner']
    if (ownerJson !== undefined && ownerJson !== null) {
        owner = parsePublicUserInfoFromJson(ownerJson)
    }
    return newTagDefinition({
        idPersistent: tagDefinitionApi['id_persistent'],
        idParentPersistent: tagDefinitionApi['id_parent_persistent'],
        namePath,
        version: tagDefinitionApi['version'],
        curated: tagDefinitionApi['curated'],
        columnType: columnType,
        owner: owner,
        description: tagDefinitionApi['description'],
        hidden: tagDefinitionApi['hidden'],
        disabled: tagDefinitionApi['disabled']
    })
}
export const tagTypeMapAppToApi = new Map<TagType, string>([
    [TagType.Inner, 'INNER'],
    [TagType.String, 'STRING'],
    [TagType.Float, 'FLOAT']
])

export function tagDefinitionToApi(tagDef: TagDefinition) {
    return {
        id_persistent: tagDef.idPersistent,
        name: tagDef.namePath.at(-1),
        id_parent_persistent: tagDef.idParentPersistent,
        type: tagTypeMapAppToApi.get(tagDef.columnType),
        version: tagDef.version,
        curated: tagDef.curated,
        owner: tagDef.owner,
        hidden: tagDef.hidden,
        disabled: tagDef.disabled
    }
}
