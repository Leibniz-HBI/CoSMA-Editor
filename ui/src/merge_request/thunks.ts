import { MergeRequestStep, newMergeRequest } from './state'
import { parsePublicUserInfoFromJson } from '../user/thunks'
import { exceptionMessage } from '../util/exception'
import { parseColumnsFromApi } from '../column_menu/thunks'
import { addError } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    getMergeRequestsError,
    getMergeRequestsStart,
    getMergeRequestsSuccess
} from './slice'
import { cosmaeMergeRequestApiGetMergeRequests } from '../openapi/cosmae'

export function getColumnMergeRequests(): ThunkWithFetch<void> {
    return async (dispatch, _getState,_fetch) => {
        dispatch(getMergeRequestsStart())
        try {
            const rsp = await cosmaeMergeRequestApiGetMergeRequests({})
            if (rsp.data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const created = rsp.data.created.map((mr: any) =>
                    parseMergeRequestFromJson(mr)
                )
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const assigned = rsp.data.assigned.map((mr: any) =>
                    parseMergeRequestFromJson(mr)
                )
                dispatch(getMergeRequestsSuccess({ created, assigned }))
            } else {
                dispatch(getMergeRequestsError())
                dispatch(addError(rsp.error.msg))
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
    const originColumn = parseColumnsFromApi(mrJson['origin'], undefined)
    const destinationColumn = parseColumnsFromApi(mrJson['destination'], undefined)
    const step = mergeRequestStateFromApiMap[mrJson['state']]
    const disableOriginOnMerge = mrJson['disable_origin_on_merge']
    return newMergeRequest({
        idPersistent,
        assignedTo,
        createdBy,
        destinationColumn,
        originColumn,
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
