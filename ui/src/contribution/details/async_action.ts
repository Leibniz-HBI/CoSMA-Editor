import { Dispatch } from 'react'
import { AsyncAction } from '../../util/async_action'
import {
    ContributionDetailsAction,
    LoadContributionDetailsAction,
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
import { AppDispatch } from '../../store'
import { addError } from '../../util/notification/slice'

export class PatchContributionAction extends AsyncAction<
    ContributionDetailsAction,
    void
> {
    idPersistent: string
    name?: string
    description?: string
    hasHeader?: boolean

    constructor({
        idPersistent,
        name,
        description,
        hasHeader
    }: {
        idPersistent: string
        name?: string
        description?: string
        hasHeader?: boolean
    }) {
        super()
        this.idPersistent = idPersistent
        this.name = name
        this.description = description
        this.hasHeader = hasHeader
    }

    async run(
        dispatch: Dispatch<ContributionDetailsAction>,
        reduxDispatch: AppDispatch
    ): Promise<void> {
        dispatch(new PatchContributionDetailsStartAction())
        try {
            const body: { [key: string]: string | boolean } = {}
            if (this.name !== undefined) {
                body['name'] = this.name
            }
            if (this.description !== undefined) {
                body['description'] = this.description
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
            dispatch(new PatchContributionDetailsErrorAction())
            reduxDispatch(
                addError(
                    `Could not update contribution. Reason: "${
                        (await rsp.json())['msg']
                    }".`
                )
            )
        } catch (e: unknown) {
            dispatch(new PatchContributionDetailsErrorAction())
            reduxDispatch(addError(exceptionMessage(e)))
        }
    }
}

export class LoadContributionDetailsAsyncAction extends AsyncAction<
    LoadContributionDetailsAction,
    void
> {
    idPersistent: string

    constructor(idPersistent: string) {
        super()
        this.idPersistent = idPersistent
    }

    async run(
        dispatch: Dispatch<ContributionDetailsAction>,
        reduxDispatch: AppDispatch
    ): Promise<void> {
        dispatch(new LoadContributionDetailsStartAction())
        try {
            const rsp = await fetch(
                config.api_path + '/contributions/' + this.idPersistent,
                {
                    credentials: 'include'
                }
            )
            if (rsp.status != 200) {
                dispatch(new LoadContributionDetailsErrorAction())
                reduxDispatch(
                    addError(
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
            dispatch(new LoadContributionDetailsErrorAction())
            reduxDispatch(addError(exceptionMessage(e)))
        }
    }
}
