import { Dispatch } from 'react'
import { AsyncAction } from '../../util/async_action'
import {
    ContributionDetailsAction,
    LoadContributionDetailsErrorAction,
    LoadContributionDetailsStartAction,
    LoadContributionDetailsSuccessAction,
    PatchContributionDetailsErrorAction,
    PatchContributionDetailsStartAction,
    PatchContributionDetailsSuccessAction
} from './action'
import { exceptionMessage } from '../../util/exception'
import { config } from '../../config'
import { parseContributionFromApi } from '../async_actions'

export class PatchContributionAction extends AsyncAction<
    ContributionDetailsAction,
    void
> {
    idPersistent: string
    name?: string
    description?: string
    isAnonymous?: boolean
    hasHeader?: boolean

    constructor({
        idPersistent,
        name,
        description,
        isAnonymous,
        hasHeader
    }: {
        idPersistent: string
        name?: string
        description?: string
        isAnonymous?: boolean
        hasHeader?: boolean
    }) {
        super()
        this.idPersistent = idPersistent
        this.name = name
        this.description = description
        this.isAnonymous = isAnonymous
        this.hasHeader = hasHeader
    }

    async run(dispatch: Dispatch<ContributionDetailsAction>): Promise<void> {
        dispatch(new PatchContributionDetailsStartAction())
        try {
            const body: { [key: string]: string | boolean } = {}
            if (this.name !== undefined) {
                body['name'] = this.name
            }
            if (this.description !== undefined) {
                body['description'] = this.description
            }
            if (this.isAnonymous !== undefined) {
                body['anonymous'] = this.isAnonymous
            }
            if (this.hasHeader !== undefined) {
                body['has_header'] = this.hasHeader
            }
            const rsp = await fetch(
                config.api_path + '/contributions/' + this.idPersistent,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    body: JSON.stringify(body)
                }
            )
            if (rsp.status == 200) {
                dispatch(
                    new PatchContributionDetailsSuccessAction(
                        parseContributionFromApi(await rsp.json())
                    )
                )
                return
            }
            dispatch(
                new PatchContributionDetailsErrorAction(
                    `Could not update contribution. Reason: "${
                        (await rsp.json())['msg']
                    }".`
                )
            )
        } catch (e: unknown) {
            dispatch(new PatchContributionDetailsErrorAction(exceptionMessage(e)))
        }
    }
}

export class LoadContributionDetailsAction extends AsyncAction<
    ContributionDetailsAction,
    void
> {
    idPersistent: string

    constructor(idPersistent: string) {
        super()
        this.idPersistent = idPersistent
    }

    async run(dispatch: Dispatch<ContributionDetailsAction>): Promise<void> {
        dispatch(new LoadContributionDetailsStartAction())
        try {
            const rsp = await fetch(
                config.api_path + '/contributions/' + this.idPersistent,
                {
                    credentials: 'include'
                }
            )
            if (rsp.status != 200) {
                dispatch(
                    new LoadContributionDetailsErrorAction(
                        `Could not load contribution details. Reason: "${
                            (await rsp.json())['msg']
                        }".`
                    )
                )
                return
            }
            const contribution = parseContributionFromApi(await rsp.json())
            dispatch(new LoadContributionDetailsSuccessAction(contribution))
        } catch (e: unknown) {
            dispatch(new LoadContributionDetailsErrorAction(exceptionMessage(e)))
        }
    }
}
