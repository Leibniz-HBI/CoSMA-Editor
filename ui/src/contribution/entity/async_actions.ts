import { Dispatch } from 'react'
import { AsyncAction } from '../../util/async_action'
import {
    ContributionEntityAction,
    GetContributionEntityDuplicatesAction,
    GetContributionEntitiesErrorAction,
    GetContributionEntitiesStartAction,
    GetContributionEntitiesSuccessAction,
    GetContributionEntityDuplicatesErrorAction,
    GetContributionEntityDuplicatesStartAction,
    GetContributionEntityDuplicatesSuccessAction,
    CompleteEntityAssignmentStartAction,
    CompleteEntityAssignmentSuccessAction,
    CompleteEntityAssignmentErrorAction,
    PutDuplicateStartAction,
    PutDuplicateErrorAction,
    PutDuplicateSuccessAction,
    GetContributionTagInstancesStartAction,
    GetContributionTagInstancesSuccessAction,
    GetContributionTagInstancesErrorAction
} from './action'
import { config } from '../../config'
import { exceptionMessage } from '../../util/exception'
import { Entity, EntityWithDuplicates, ScoredEntity, TagInstance } from './state'
import { Remote } from '../../util/state'
import { fetch_chunk_get } from '../../util/fetch'
import { ColumnDefinition } from '../../column_menu/state'

export class GetContributionEntitiesAction extends AsyncAction<
    ContributionEntityAction,
    EntityWithDuplicates[]
> {
    idContributionPersistent: string
    constructor(idContributionPersistent: string) {
        super()
        this.idContributionPersistent = idContributionPersistent
    }

    async run(
        dispatch: Dispatch<ContributionEntityAction>
    ): Promise<EntityWithDuplicates[]> {
        dispatch(new GetContributionEntitiesStartAction())
        try {
            let entities: EntityWithDuplicates[] = []
            for (let i = 0; ; i += 500) {
                const rsp = await fetch_chunk_get({
                    api_path:
                        config.api_path +
                        `/contributions/${this.idContributionPersistent}/entities/chunk`,
                    offset: i,
                    limit: 500
                })
                if (rsp.status == 200) {
                    const json = await rsp.json()
                    const entitiesChunk = json['persons'].map(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (entityJson: any) =>
                            new EntityWithDuplicates({
                                ...parseEntityObjectFromJson(entityJson),
                                similarEntities: new Remote([])
                            })
                    )
                    entities = [...entities, ...entitiesChunk]
                    if (entitiesChunk.length == 0) {
                        dispatch(new GetContributionEntitiesSuccessAction(entities))
                        return entities
                    }
                } else {
                    dispatch(
                        new GetContributionEntitiesErrorAction((await rsp.json()).msg)
                    )
                    return []
                }
            }
        } catch (exc: unknown) {
            dispatch(new GetContributionEntitiesErrorAction(exceptionMessage(exc)))
        }
        return []
    }
}

export class PutDuplicateAction extends AsyncAction<ContributionEntityAction, void> {
    idContributionPersistent: string
    idEntityOriginPersistent: string
    idEntityDestinationPersistent?: string

    constructor({
        idContributionPersistent,
        idEntityOriginPersistent,
        idEntityDestinationPersistent
    }: {
        idContributionPersistent: string
        idEntityOriginPersistent: string
        idEntityDestinationPersistent?: string
    }) {
        super()
        this.idContributionPersistent = idContributionPersistent
        this.idEntityOriginPersistent = idEntityOriginPersistent
        this.idEntityDestinationPersistent = idEntityDestinationPersistent
    }

    async run(dispatch: Dispatch<ContributionEntityAction>): Promise<void> {
        dispatch(new PutDuplicateStartAction(this.idEntityOriginPersistent))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/contributions/${this.idContributionPersistent}/entities/${this.idEntityOriginPersistent}/duplicate`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    body: JSON.stringify({
                        id_entity_destination_persistent:
                            this.idEntityDestinationPersistent
                    })
                }
            )
            if (rsp.status == 200) {
                const json = await rsp.json()
                const assignedDuplicateJson = json['assigned_duplicate']
                let assignedDuplicate = undefined
                if (
                    assignedDuplicateJson !== null &&
                    assignedDuplicateJson !== undefined
                ) {
                    assignedDuplicate = parseEntityObjectFromJson(assignedDuplicateJson)
                }
                dispatch(
                    new PutDuplicateSuccessAction(
                        this.idEntityOriginPersistent,
                        assignedDuplicate
                    )
                )
            } else {
                const json = await rsp.json()
                dispatch(
                    new PutDuplicateErrorAction(
                        this.idEntityOriginPersistent,
                        json['msg']
                    )
                )
            }
        } catch (e: unknown) {
            dispatch(
                new PutDuplicateErrorAction(
                    this.idEntityOriginPersistent,
                    exceptionMessage(e)
                )
            )
        }
    }
}

export class GetContributionEntityDuplicateCandidatesAction extends AsyncAction<
    GetContributionEntityDuplicatesAction,
    Map<string, string[]>
> {
    idContributionPersistent: string
    idEntityPersistentList: string[]
    constructor({
        idContributionPersistent,
        entityIdPersistentList
    }: {
        idContributionPersistent: string
        entityIdPersistentList: string[]
    }) {
        super()
        this.idContributionPersistent = idContributionPersistent
        this.idEntityPersistentList = entityIdPersistentList
    }

    async run(
        dispatch: Dispatch<GetContributionEntityDuplicatesAction>
    ): Promise<Map<string, string[]>> {
        try {
            for (const idEntityPersistent of this.idEntityPersistentList) {
                dispatch(
                    new GetContributionEntityDuplicatesStartAction(idEntityPersistent)
                )
            }
            const rsp = await fetch(
                config.api_path +
                    `/contributions/${this.idContributionPersistent}/entities/similar`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        id_entity_persistent_list: this.idEntityPersistentList
                    })
                }
            )
            if (rsp.status == 200) {
                const entitiesGroupMap = new Map<string, string[]>()
                const json = await rsp.json()
                const matchesMap = json['matches']
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                for (const idEntityPersistent in matchesMap) {
                    let assignedDuplicate =
                        matchesMap[idEntityPersistent]['assigned_duplicate']
                    if (assignedDuplicate !== null && assignedDuplicate !== undefined) {
                        assignedDuplicate = parseEntityObjectFromJson(assignedDuplicate)
                    } else {
                        assignedDuplicate = undefined
                    }
                    const matches = matchesMap[idEntityPersistent]['matches'].map(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (scoredEntity: any) => parseScoredEntityFromJson(scoredEntity)
                    )
                    entitiesGroupMap.set(idEntityPersistent, [
                        idEntityPersistent,
                        ...matches.map((match: ScoredEntity) => match.idPersistent)
                    ])
                    dispatch(
                        new GetContributionEntityDuplicatesSuccessAction(
                            idEntityPersistent,
                            matches,
                            assignedDuplicate
                        )
                    )
                }
                return entitiesGroupMap
            }
            for (const idEntityPersistent of this.idEntityPersistentList) {
                dispatch(
                    new GetContributionEntityDuplicatesErrorAction(
                        idEntityPersistent,
                        (await rsp.json())['msg']
                    )
                )
            }
        } catch (exc: unknown) {
            for (const idEntityPersistent of this.idEntityPersistentList) {
                dispatch(
                    new GetContributionEntityDuplicatesErrorAction(
                        idEntityPersistent,
                        exceptionMessage(exc)
                    )
                )
            }
        }
        return new Map()
    }
}

export class CompleteEntityAssignmentAction extends AsyncAction<
    ContributionEntityAction,
    void
> {
    idContributionPersistent: string

    constructor(idContributionPersistent: string) {
        super()
        this.idContributionPersistent = idContributionPersistent
    }
    async run(dispatch: Dispatch<ContributionEntityAction>): Promise<void> {
        dispatch(new CompleteEntityAssignmentStartAction())
        try {
            const rsp = await fetch(
                config.api_path +
                    `/contributions/${this.idContributionPersistent}/entity_assignment_complete`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            )
            if (rsp.status == 200) {
                dispatch(new CompleteEntityAssignmentSuccessAction())
            } else {
                const json = await rsp.json()
                dispatch(new CompleteEntityAssignmentErrorAction(json['msg']))
            }
        } catch (exc: unknown) {
            dispatch(new CompleteEntityAssignmentErrorAction(exceptionMessage(exc)))
        }
    }
}

export class GetContributionTagInstancesAsyncAction extends AsyncAction<
    ContributionEntityAction,
    void
> {
    entitiesGroupMap: Map<string, string[]>
    tagDefinitionList: ColumnDefinition[]
    idContributionPersistent?: string
    idMergeRequestPersistent?: string

    constructor({
        entitiesGroupMap,
        tagDefinitionList,
        idContributionPersistent = undefined,
        idMergeRequestPersistent = undefined
    }: {
        entitiesGroupMap: Map<string, string[]>
        tagDefinitionList: ColumnDefinition[]
        idContributionPersistent?: string
        idMergeRequestPersistent?: string
    }) {
        super()
        this.entitiesGroupMap = entitiesGroupMap
        this.tagDefinitionList = tagDefinitionList
        this.idContributionPersistent = idContributionPersistent
        this.idMergeRequestPersistent = idMergeRequestPersistent
    }

    async run(dispatch: Dispatch<ContributionEntityAction>): Promise<void> {
        try {
            dispatch(
                new GetContributionTagInstancesStartAction(
                    this.entitiesGroupMap,
                    this.tagDefinitionList
                )
            )
            const entitiesSet = new Set<string>()
            for (const [
                _idEntity,
                entityGroupList
            ] of this.entitiesGroupMap.entries()) {
                for (const idEntity of entityGroupList) {
                    entitiesSet.add(idEntity)
                }
            }
            const rsp = await fetch(config.api_path + '/tags/entities', {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    id_tag_definition_persistent_list: this.tagDefinitionList.map(
                        (tagDef) => tagDef.idPersistent
                    ),
                    id_entity_persistent_list: Array.from(entitiesSet),
                    id_contribution_persistent: this.idContributionPersistent,
                    id_merge_request_persistent: this.idMergeRequestPersistent
                })
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                dispatch(
                    new GetContributionTagInstancesSuccessAction(
                        this.entitiesGroupMap,
                        this.tagDefinitionList,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        json['value_responses'].map((instance: any) =>
                            parseTagInstanceFromJson(instance)
                        )
                    )
                )
            } else {
                dispatch(
                    new GetContributionTagInstancesErrorAction(
                        this.entitiesGroupMap,
                        this.tagDefinitionList,
                        (await rsp.json())['msg']
                    )
                )
            }
        } catch (e: unknown) {
            dispatch(
                new GetContributionTagInstancesErrorAction(
                    this.entitiesGroupMap,
                    this.tagDefinitionList,
                    exceptionMessage(e)
                )
            )
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEntityObjectFromJson(json: any) {
    return new Entity({
        idPersistent: json['id_persistent'],
        displayTxt: json['display_txt'],
        version: Number.parseInt(json['version'])
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseScoredEntityFromJson(json: any) {
    return new ScoredEntity({
        ...parseEntityObjectFromJson(json['entity']),
        similarity: json['similarity']
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTagInstanceFromJson(json: any) {
    const idTagDefinitionPersistent = json['id_tag_definition_requested_persistent']
    return new TagInstance(json['id_entity_persistent'], idTagDefinitionPersistent, {
        value: json['value'],
        idPersistent: json['id_persistent'],
        version: json['version'],
        isExisting: json['is_existing'],
        isRequested: json['id_tag_definition_persistent'] == idTagDefinitionPersistent
    })
}
