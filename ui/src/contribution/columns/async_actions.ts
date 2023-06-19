import { Dispatch } from 'react'
import { AsyncAction } from '../../util/async_action'
import {
    ColumnDefinitionsContributionAction,
    FinalizeColumnAssignmentErrorAction,
    FinalizeColumnAssignmentStartAction,
    FinalizeColumnAssignmentSuccessAction,
    LoadColumnDefinitionsContributionErrorAction,
    LoadColumnDefinitionsContributionStartAction,
    LoadColumnDefinitionsContributionSuccessAction,
    PatchColumnDefinitionContributionErrorAction,
    PatchColumnDefinitionContributionStartAction,
    PatchColumnDefinitionContributionSuccessAction
} from './actions'
import { config } from '../../config'
import { ColumnDefinitionContribution } from './state'
import { columnTypeMapApiToApp } from '../../column_menu/async_actions'
import { exceptionMessage } from '../../util/exception'
import { parseContributionFromApi } from '../async_actions'

export class LoadColumnDefinitionsContributionAction extends AsyncAction<
    ColumnDefinitionsContributionAction,
    void
> {
    idPersistent: string
    constructor(idPersistent: string) {
        super()
        this.idPersistent = idPersistent
    }

    async run(dispatch: Dispatch<ColumnDefinitionsContributionAction>): Promise<void> {
        dispatch(new LoadColumnDefinitionsContributionStartAction())
        try {
            const rsp = await fetch(
                config.api_path + `/contributions/${this.idPersistent}/tags`,
                { credentials: 'include' }
            )
            if (rsp.status == 200) {
                const active: ColumnDefinitionContribution[] = []
                const discarded: ColumnDefinitionContribution[] = []
                const json = await rsp.json()
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                json['tag_definitions'].forEach((tagDefinition: any) => {
                    const columnDefinition =
                        parseTagDefinitionContribution(tagDefinition)
                    if (columnDefinition.discard) {
                        discarded.push(columnDefinition)
                    } else {
                        active.push(columnDefinition)
                    }
                })
                const contribution = parseContributionFromApi(
                    json['contribution_candidate']
                )
                dispatch(
                    new LoadColumnDefinitionsContributionSuccessAction(
                        active,
                        discarded,
                        contribution
                    )
                )
                return
            }
            const json = await rsp.json()
            dispatch(new LoadColumnDefinitionsContributionErrorAction(json['msg']))
        } catch (e: unknown) {
            dispatch(
                new LoadColumnDefinitionsContributionErrorAction(exceptionMessage(e))
            )
        }
    }
}

export class PatchColumnDefinitionContributionAction extends AsyncAction<
    ColumnDefinitionsContributionAction,
    void
> {
    idPersistent: string
    idContributionPersistent: string
    idExistingPersistent?: string
    name?: string
    discard?: boolean

    constructor({
        idPersistent,
        idContributionPersistent,
        idExistingPersistent = undefined,
        name = undefined,
        discard = undefined
    }: {
        idPersistent: string
        idContributionPersistent: string
        idExistingPersistent?: string
        name?: string
        discard?: boolean
    }) {
        super()
        this.idPersistent = idPersistent
        this.idContributionPersistent = idContributionPersistent
        this.idExistingPersistent = idExistingPersistent
        this.name = name
        this.discard = discard
    }
    async run(dispatch: Dispatch<ColumnDefinitionsContributionAction>): Promise<void> {
        dispatch(new PatchColumnDefinitionContributionStartAction())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let body: any
        // discard is handled from a different component.
        if (this.discard !== undefined) {
            body = { discard: this.discard }
        } else if (this.idExistingPersistent !== undefined) {
            body = {
                id_existing_persistent: this.idExistingPersistent
            }
        }
        if (this.name !== undefined) {
            body.name = this.name
        }
        const rsp = await fetch(
            config.api_path +
                `/contributions/${this.idContributionPersistent}/tags/${this.idPersistent}`,
            {
                method: 'PATCH',
                credentials: 'include',
                body: JSON.stringify(body)
            }
        )
        if (rsp.status == 200) {
            const json = await rsp.json()
            const changedColumnDefinition = parseTagDefinitionContribution(json)

            dispatch(
                new PatchColumnDefinitionContributionSuccessAction(
                    changedColumnDefinition
                )
            )
        } else {
            const json = await rsp.json()
            dispatch(new PatchColumnDefinitionContributionErrorAction(json['msg']))
        }
    }
}

export class FinalizeColumnAssignmentAction extends AsyncAction<
    ColumnDefinitionsContributionAction,
    void
> {
    idCandidatePersistent: string
    constructor(idCandidatePersistent: string) {
        super()
        this.idCandidatePersistent = idCandidatePersistent
    }
    async run(dispatch: Dispatch<ColumnDefinitionsContributionAction>): Promise<void> {
        dispatch(new FinalizeColumnAssignmentStartAction())
        try {
            const rsp = await fetch(
                config.api_path +
                    `/contributions/${this.idCandidatePersistent}/column_assignment_complete`,
                { credentials: 'include', method: 'POST' }
            )
            if (rsp.status == 200) {
                dispatch(new FinalizeColumnAssignmentSuccessAction())
            } else {
                const json = await rsp.json()
                dispatch(new FinalizeColumnAssignmentErrorAction(json['msg']))
            }
        } catch (e: unknown) {
            dispatch(new FinalizeColumnAssignmentErrorAction(exceptionMessage(e)))
        }
    }
}

export function parseTagDefinitionContribution(
    tagDefinition: any //eslint-disable-line @typescript-eslint/no-explicit-any
): ColumnDefinitionContribution {
    const name = tagDefinition['name']
    const idPersistent = tagDefinition['id_persistent']
    const idExistingPersistent = tagDefinition['id_existing_persistent']
    const idParentPersistent = tagDefinition['id_parent_persistent']
    const type = columnTypeMapApiToApp.get(tagDefinition['type'])
    const indexInFile = tagDefinition['index_in_file']
    const discard = tagDefinition['discard']
    return new ColumnDefinitionContribution({
        name: name,
        idPersistent: idPersistent,
        idExistingPersistent: idExistingPersistent,
        idParentPersistent: idParentPersistent,
        type: type,
        indexInFile: indexInFile,
        discard: discard
    })
}
