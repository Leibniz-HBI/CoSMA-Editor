import { Dispatch } from 'react'
import { AsyncAction } from '../../util/async_action'
import {
    GetMergeRequestConflictErrorAction,
    GetMergeRequestConflictStartAction,
    GetMergeRequestConflictSuccessAction,
    MergeRequestConflictResolutionAction,
    ResolveConflictErrorAction,
    ResolveConflictStartAction,
    ResolveConflictSuccessAction
} from './actions'
import { exceptionMessage } from '../../util/exception'
import { config } from '../../config'
import { parseColumnDefinitionsFromApi } from '../../column_menu/async_actions'
import { MergeRequestConflict, TagInstance } from './state'
import { parseEntityObjectFromJson } from '../../contribution/entity/async_actions'
import { Entity } from '../../contribution/entity/state'
import { ColumnDefinition } from '../../column_menu/state'
import { Remote } from '../../util/state'

export class GetMergeRequestConflictAction extends AsyncAction<
    MergeRequestConflictResolutionAction,
    void
> {
    idMergeRequestPersistent: string

    constructor(idMergeRequestPersistent: string) {
        super()
        this.idMergeRequestPersistent = idMergeRequestPersistent
    }

    async run(dispatch: Dispatch<MergeRequestConflictResolutionAction>): Promise<void> {
        dispatch(new GetMergeRequestConflictStartAction())
        try {
            const rsp = await fetch(
                config.api_path +
                    `/merge_requests/${this.idMergeRequestPersistent}/conflicts`,
                {
                    credentials: 'include'
                }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const updated = json['updated'].map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (conflict: any) =>
                        new Remote(parseMergeRequestConflictFromApi(conflict))
                )
                const conflicts = json['conflicts'].map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (conflict: any) =>
                        new Remote(parseMergeRequestConflictFromApi(conflict))
                )
                const tagDefinitionOrigin = parseColumnDefinitionsFromApi(
                    json['tag_definition_origin'],
                    []
                )

                const tagDefinitionDestination = parseColumnDefinitionsFromApi(
                    json['tag_definition_destination'],
                    []
                )
                dispatch(
                    new GetMergeRequestConflictSuccessAction({
                        updated,
                        conflicts,
                        tagDefinitionOrigin,
                        tagDefinitionDestination
                    })
                )
            } else {
                dispatch(new GetMergeRequestConflictErrorAction(json['msg']))
            }
        } catch (e: unknown) {
            dispatch(new GetMergeRequestConflictErrorAction(exceptionMessage(e)))
        }
    }
}

export class ResolveConflictAction extends AsyncAction<
    MergeRequestConflictResolutionAction,
    void
> {
    idMergeRequestPersistent: string
    entity: Entity
    tagInstanceOrigin: TagInstance
    tagDefinitionOrigin: ColumnDefinition
    tagInstanceDestination?: TagInstance
    tagDefinitionDestination: ColumnDefinition
    replace: boolean
    constructor({
        idMergeRequestPersistent,
        entity,
        tagInstanceOrigin,
        tagDefinitionOrigin,
        tagInstanceDestination,
        tagDefinitionDestination,
        replace
    }: {
        idMergeRequestPersistent: string
        entity: Entity
        tagInstanceOrigin: TagInstance
        tagDefinitionOrigin: ColumnDefinition
        tagInstanceDestination?: TagInstance
        tagDefinitionDestination: ColumnDefinition
        replace: boolean
    }) {
        super()
        this.idMergeRequestPersistent = idMergeRequestPersistent
        this.entity = entity
        this.tagInstanceOrigin = tagInstanceOrigin
        this.tagDefinitionOrigin = tagDefinitionOrigin
        this.tagInstanceDestination = tagInstanceDestination
        this.tagDefinitionDestination = tagDefinitionDestination
        this.replace = replace
    }

    async run(dispatch: Dispatch<MergeRequestConflictResolutionAction>): Promise<void> {
        dispatch(new ResolveConflictStartAction(this.entity.idPersistent))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/merge_requests/${this.idMergeRequestPersistent}/resolve`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        id_entity_version: this.entity.version,
                        id_tag_definition_origin_version:
                            this.tagDefinitionOrigin.version,
                        id_tag_instance_origin_version: this.tagInstanceOrigin.version,
                        id_tag_definition_destination_version:
                            this.tagDefinitionDestination.version,
                        id_tag_instance_destination_version:
                            this.tagInstanceDestination?.version,
                        replace: this.replace
                    })
                }
            )
            if (rsp.status == 200) {
                dispatch(
                    new ResolveConflictSuccessAction(
                        this.entity.idPersistent,
                        this.replace
                    )
                )
            } else {
                const json = await rsp.json()
                dispatch(
                    new ResolveConflictErrorAction(
                        this.entity.idPersistent,
                        json['msg']
                    )
                )
            }
        } catch (e: unknown) {
            dispatch(
                new ResolveConflictErrorAction(
                    this.entity.idPersistent,
                    exceptionMessage(e)
                )
            )
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMergeRequestConflictFromApi(json: any) {
    const tagInstanceDestinationJson = json['tag_instance_destination']
    const tagInstanceDestination =
        tagInstanceDestinationJson === null
            ? undefined
            : parseTagInstanceFromJson(tagInstanceDestinationJson)
    return new MergeRequestConflict({
        entity: parseEntityObjectFromJson(json['entity']),
        tagInstanceOrigin: parseTagInstanceFromJson(json['tag_instance_origin']),
        tagInstanceDestination: tagInstanceDestination,
        replace: json['replace']
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTagInstanceFromJson(json: any) {
    return new TagInstance({
        idPersistent: json['id_persistent'],
        version: json['version'],
        value: json['value']
    })
}
