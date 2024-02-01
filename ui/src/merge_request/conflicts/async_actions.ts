import { Dispatch } from 'react'
import { AsyncAction } from '../../util/async_action'
import {
    GetMergeRequestConflictErrorAction,
    GetMergeRequestConflictStartAction,
    GetMergeRequestConflictSuccessAction,
    MergeRequestConflictResolutionAction,
    ResolveConflictErrorAction,
    ResolveConflictStartAction,
    ResolveConflictSuccessAction,
    StartMergeErrorAction,
    StartMergeStartAction,
    StartMergeSuccessAction
} from './actions'
import { exceptionMessage } from '../../util/exception'
import { config } from '../../config'
import { MergeRequestConflict, TagInstance, newTagInstance } from './state'
import { parseEntityObjectFromJson } from '../../table/async_actions'
import { Entity } from '../../table/state'
import { TagDefinition } from '../../column_menu/state'
import { Remote } from '../../util/state'
import { parseMergeRequestFromJson } from '../async_actions'
import { AppDispatch } from '../../store'
import { addError, addSuccessVanish } from '../../util/notification/slice'

export class GetMergeRequestConflictAction extends AsyncAction<
    MergeRequestConflictResolutionAction,
    void
> {
    idMergeRequestPersistent: string

    constructor(idMergeRequestPersistent: string) {
        super()
        this.idMergeRequestPersistent = idMergeRequestPersistent
    }

    async run(
        dispatch: Dispatch<MergeRequestConflictResolutionAction>,
        reduxDispatch: AppDispatch
    ): Promise<void> {
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
                const mergeRequest = parseMergeRequestFromJson(json['merge_request'])
                dispatch(
                    new GetMergeRequestConflictSuccessAction({
                        updated,
                        conflicts,
                        mergeRequest
                    })
                )
            } else {
                const msg = json['msg']
                dispatch(new GetMergeRequestConflictErrorAction())
                reduxDispatch(addError(msg))
            }
        } catch (e: unknown) {
            dispatch(new GetMergeRequestConflictErrorAction())
            reduxDispatch(addError(exceptionMessage(e)))
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
    tagDefinitionOrigin: TagDefinition
    tagInstanceDestination?: TagInstance
    tagDefinitionDestination: TagDefinition
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
        tagDefinitionOrigin: TagDefinition
        tagInstanceDestination?: TagInstance
        tagDefinitionDestination: TagDefinition
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

    async run(
        dispatch: Dispatch<MergeRequestConflictResolutionAction>,
        reduxDispatch: AppDispatch
    ): Promise<void> {
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
                        id_entity_persistent: this.entity.idPersistent,
                        id_tag_definition_origin_persistent:
                            this.tagDefinitionOrigin.idPersistent,
                        id_tag_instance_origin_persistent:
                            this.tagInstanceOrigin.idPersistent,
                        id_tag_definition_destination_persistent:
                            this.tagDefinitionDestination.idPersistent,
                        id_tag_instance_destination_persistent:
                            this.tagInstanceDestination?.idPersistent,
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
                dispatch(new ResolveConflictErrorAction(this.entity.idPersistent))
                reduxDispatch(addError(json['msg']))
            }
        } catch (e: unknown) {
            dispatch(new ResolveConflictErrorAction(this.entity.idPersistent))
            reduxDispatch(addError(exceptionMessage(e)))
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
        replace: json['replace'] ?? undefined
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTagInstanceFromJson(json: any) {
    return newTagInstance({
        idPersistent: json['id_persistent'],
        version: json['version'],
        value: json['value']
    })
}

export class StartMergeAction extends AsyncAction<
    MergeRequestConflictResolutionAction,
    void
> {
    idMergeRequestPersistent: string

    constructor(idMergeRequestPersistent: string) {
        super()
        this.idMergeRequestPersistent = idMergeRequestPersistent
    }

    async run(
        dispatch: Dispatch<MergeRequestConflictResolutionAction>,
        reduxDispatch: AppDispatch
    ): Promise<void> {
        dispatch(new StartMergeStartAction())
        try {
            const rsp = await fetch(
                config.api_path +
                    `/merge_requests/${this.idMergeRequestPersistent}/merge`,
                {
                    credentials: 'include',
                    method: 'POST'
                }
            )
            if (rsp.status == 200) {
                dispatch(new StartMergeSuccessAction())
                reduxDispatch(addSuccessVanish('Application of resolutions started.'))
            } else {
                const json = await rsp.json()
                let msg = json['msg']
                if (
                    msg ==
                        'There are conflicts for the merge request, where the underlying data has changed.' ||
                    msg == 'There are unresolved conflicts for the merge request.'
                ) {
                    msg = msg + ' Reload the page to see the changes.'
                }
                dispatch(new StartMergeErrorAction())
                reduxDispatch(addError(msg))
            }
        } catch (e: unknown) {
            dispatch(new StartMergeErrorAction())
            reduxDispatch(addError(exceptionMessage(e)))
        }
    }
}
