import { MergeRequestStep, newMergeRequest, MergeRequest } from './state'
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
import { cosmaeMergeRequestApiGetMergeRequests, MergeRequest as MergeRequestApi } from '../openapi/cosmae'

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

export function parseMergeRequestFromJson(mr: MergeRequestApi): MergeRequest {
    const idPersistent = mr.id_persistent
    let assignedTo = undefined
    if (mr.assigned_to !== null && mr.assigned_to !== undefined) {
        assignedTo = parsePublicUserInfoFromJson(mr.assigned_to)
    }
    const createdBy = parsePublicUserInfoFromJson(mr.created_by)
    const originColumn = parseColumnsFromApi(mr.origin, undefined)
    const destinationColumn = parseColumnsFromApi(mr.destination, undefined)
    const step = mergeRequestStateFromApiMap[mr.state]
    const disableOriginOnMerge = mr.disable_origin_on_merge
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
    CREATED: MergeRequestStep.Created,
    OPEN: MergeRequestStep.Open,
    CONFLICTS: MergeRequestStep.Conflicts,
    CLOSED: MergeRequestStep.Closed,
    RESOLVED: MergeRequestStep.Resolved,
    MERGED: MergeRequestStep.Merged,
    ERROR: MergeRequestStep.Error,
}
