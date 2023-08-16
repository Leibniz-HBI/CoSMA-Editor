import { Dispatch } from 'react'
import { AsyncAction } from '../util/async_action'
import {
    GetMergeRequestsErrorAction,
    GetMergeRequestsStartAction,
    GetMergeRequestsSuccessAction,
    MergeRequestAction
} from './actions'
import { config } from '../config'
import { MergeRequest, MergeRequestStep } from './state'
import { parsePublicUserInfoFromJson } from '../user/async_actions'
import { parseColumnDefinitionsFromApi } from '../column_menu/async_actions'
import { exceptionMessage } from '../util/exception'

export class GetMergeRequestsAction extends AsyncAction<MergeRequestAction, void> {
    async run(dispatch: Dispatch<MergeRequestAction>) {
        dispatch(new GetMergeRequestsStartAction())
        try {
            const rsp = await fetch(config.api_path + '/merge_requests', {
                credentials: 'include'
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const created = json['created'].map((mr: any) =>
                    parseMergeRequestFromJson(mr)
                )
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const assigned = json['assigned'].map((mr: any) =>
                    parseMergeRequestFromJson(mr)
                )
                dispatch(new GetMergeRequestsSuccessAction({ created, assigned }))
            } else {
                const json = await rsp.json()
                dispatch(new GetMergeRequestsErrorAction(json['msg']))
            }
        } catch (exc: unknown) {
            dispatch(new GetMergeRequestsErrorAction(exceptionMessage(exc)))
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMergeRequestFromJson(mrJson: any) {
    const idPersistent = mrJson['id_persistent']
    const assignedTo = parsePublicUserInfoFromJson(mrJson['assigned_to'])
    const createdBy = parsePublicUserInfoFromJson(mrJson['created_by'])
    const originTagDefinition = parseColumnDefinitionsFromApi(
        mrJson['origin'],
        undefined
    )
    const destinationTagDefinition = parseColumnDefinitionsFromApi(
        mrJson['destination'],
        undefined
    )
    const step = mergeRequestStateFromApiMap[mrJson['state']]
    return new MergeRequest({
        idPersistent,
        assignedTo,
        createdBy,
        destinationTagDefinition,
        originTagDefinition,
        step
    })
}

const mergeRequestStateFromApiMap: { [key: string]: MergeRequestStep } = {
    OPEN: MergeRequestStep.Open,
    CONFLICTS: MergeRequestStep.Conflicts,
    CLOSED: MergeRequestStep.Closed,
    RESOLVED: MergeRequestStep.Resolved,
    MERGED: MergeRequestStep.Merged,
    ERROR: MergeRequestStep.Error
}
