import { config } from '../config'
import { MergeRequestStep, newMergeRequest } from './state'
import { parsePublicUserInfoFromJson } from '../user/thunks'
import { exceptionMessage } from '../util/exception'
import { parseColumnDefinitionsFromApi } from '../column_menu/thunks'
import { addError } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    getMergeRequestsError,
    getMergeRequestsStart,
    getMergeRequestsSuccess
} from './slice'

export function getTagMergeRequests(): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getMergeRequestsStart())
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
                dispatch(getMergeRequestsSuccess({ created, assigned }))
            } else {
                const json = await rsp.json()
                dispatch(getMergeRequestsError())
                dispatch(addError(json['msg']))
            }
        } catch (exc: unknown) {
            dispatch(getMergeRequestsError())
            dispatch(addError(exceptionMessage(exc)))
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMergeRequestFromJson(mrJson: any) {
    const idPersistent = mrJson['id_persistent']
    let assignedTo = mrJson['assigned_to']
    if (assignedTo !== null && assignedTo !== undefined) {
        assignedTo = parsePublicUserInfoFromJson(assignedTo)
    }
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
    const disableOriginOnMerge = mrJson['disable_origin_on_merge']
    return newMergeRequest({
        idPersistent,
        assignedTo,
        createdBy,
        destinationTagDefinition,
        originTagDefinition,
        step,
        disableOriginOnMerge
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
