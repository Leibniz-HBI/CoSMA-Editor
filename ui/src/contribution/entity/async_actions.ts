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
    PutDuplicateSuccessAction
} from './action'
import { config } from '../../config'
import { exceptionMessage } from '../../util/exception'
import { Entity, EntityWithDuplicates, ScoredEntity } from './state'
import { Remote } from '../../util/state'
import { fetch_chunk_get } from '../../util/fetch'

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
    void
> {
    idContributionPersistent: string
    entityIdPersistentList: string[]
    constructor({
        idContributionPersistent,
        entityIdPersistentList
    }: {
        idContributionPersistent: string
        entityIdPersistentList: string[]
    }) {
        super()
        this.idContributionPersistent = idContributionPersistent
        this.entityIdPersistentList = entityIdPersistentList
    }

    async run(
        dispatch: Dispatch<GetContributionEntityDuplicatesAction>
    ): Promise<void> {
        try {
            const chunkSize = 80
            for (
                let idx = 0;
                idx < this.entityIdPersistentList.length;
                idx += chunkSize
            ) {
                const chunk = this.entityIdPersistentList.slice(
                    idx,
                    Math.min(idx + chunkSize, this.entityIdPersistentList.length)
                )
                for (const idEntityPersistent of chunk) {
                    dispatch(
                        new GetContributionEntityDuplicatesStartAction(
                            idEntityPersistent
                        )
                    )
                }
                const rsp = await fetch(
                    config.api_path +
                        `/contributions/${this.idContributionPersistent}/entities/similar`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        body: JSON.stringify({
                            entity_id_persistent_list: chunk
                        })
                    }
                )
                if (rsp.status == 200) {
                    const json = await rsp.json()
                    const matchesMap = json['matches']
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    for (const idEntityPersistent in matchesMap) {
                        let assignedDuplicate =
                            matchesMap[idEntityPersistent]['assigned_duplicate']
                        if (
                            assignedDuplicate !== null &&
                            assignedDuplicate !== undefined
                        ) {
                            assignedDuplicate =
                                parseEntityObjectFromJson(assignedDuplicate)
                        } else {
                            assignedDuplicate = undefined
                        }
                        dispatch(
                            new GetContributionEntityDuplicatesSuccessAction(
                                idEntityPersistent,
                                matchesMap[idEntityPersistent]['matches'].map(
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    (scoredEntity: any) =>
                                        parseScoredEntityFromJson(scoredEntity)
                                ),
                                assignedDuplicate
                            )
                        )
                    }
                } else {
                    for (const idEntityPersistent of this.entityIdPersistentList) {
                        dispatch(
                            new GetContributionEntityDuplicatesErrorAction(
                                idEntityPersistent,
                                (await rsp.json())['msg']
                            )
                        )
                    }
                    return
                }
            }
        } catch (exc: unknown) {
            for (const idEntityPersistent of this.entityIdPersistentList) {
                dispatch(
                    new GetContributionEntityDuplicatesErrorAction(
                        idEntityPersistent,
                        exceptionMessage(exc)
                    )
                )
            }
        }
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
