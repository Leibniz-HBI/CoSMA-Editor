import { data } from 'react-router-dom'
import { Column } from '../column_menu/state'
import { parseColumnsFromApi } from '../column_menu/thunks'
import {
    cosmaeColumnApiPermissionsDeleteOwnershipRequest,
    cosmaeColumnApiPermissionsGetOwnershipRequests,
    cosmaeColumnApiPermissionsPostAcceptOwnershipRequest,
    cosmaeColumnApiPermissionsPostOwnershipRequest
} from '../openapi/cosmae'
import { parsePublicUserInfoFromJson } from '../user/thunks'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { addError } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    acceptOwnershipRequestError,
    acceptOwnershipRequestStart,
    acceptOwnershipRequestSuccess,
    deleteOwnershipRequestError,
    deleteOwnershipRequestStart,
    deleteOwnershipRequestSuccess,
    getOwnershipRequestsError,
    getOwnershipRequestsStart,
    getOwnershipRequestsSuccess,
    putOwnerShipRequestError,
    putOwnershipRequestStart,
    putOwnershipRequestSuccess
} from './slice'
import { OwnershipRequest, PutOwnershipRequest } from './state'

export function getOwnershipRequests(): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getOwnershipRequestsStart())
        try {
            const rsp = await cosmaeColumnApiPermissionsGetOwnershipRequests()
            if (rsp.data) {
                dispatch(
                    getOwnershipRequestsSuccess({
                        petitioned: rsp.data.petitioned.map(
                            parseOwnershipRequestFromJson
                        ),
                        received: rsp.data.received.map(parseOwnershipRequestFromJson)
                    })
                )
            } else {
                dispatch(getOwnershipRequestsError())
                dispatch(addError(errorMessageFromApi(rsp.error)))
            }
        } catch (e: unknown) {
            dispatch(getOwnershipRequestsError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function putOwnershipRequest(
    args: PutOwnershipRequest
): ThunkWithFetch<Column | undefined> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(putOwnershipRequestStart(args))
        try {
            const rsp = await cosmaeColumnApiPermissionsPostOwnershipRequest({
                path: {
                    id_column_persistent: args.idColumnPersistent,
                    id_user_persistent: args.idUserPersistent
                }
            })
            if (rsp.response.status == 200) {
                dispatch(putOwnershipRequestSuccess(args))
                const data = rsp.data
                if (data !== undefined && data !== null) {
                    return parseColumnsFromApi(data)
                }
            } else {
                dispatch(putOwnerShipRequestError(args))
                if (rsp.error !== undefined) {
                    dispatch(addError(errorMessageFromApi(rsp.error)))
                }
            }
        } catch (e: unknown) {
            dispatch(putOwnerShipRequestError(args))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
export function acceptOwnershipRequest(
    idPersistent: string
): ThunkWithFetch<Column | undefined> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(acceptOwnershipRequestStart(idPersistent))
        try {
            const rsp = await cosmaeColumnApiPermissionsPostAcceptOwnershipRequest({
                path: { id_ownership_request_persistent: idPersistent }
            })
            if (rsp.data) {
                dispatch(acceptOwnershipRequestSuccess(idPersistent))
                return parseColumnsFromApi(data)
            }
            dispatch(acceptOwnershipRequestError(idPersistent))
            dispatch(addError(errorMessageFromApi(rsp.error)))
        } catch (e: unknown) {
            dispatch(acceptOwnershipRequestError(idPersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
export function deleteOwnershipRequest(idPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(deleteOwnershipRequestStart(idPersistent))
        try {
            const rsp = await cosmaeColumnApiPermissionsDeleteOwnershipRequest({
                path: { id_ownership_request_persistent: idPersistent }
            })
            if (rsp.response.status == 200) {
                dispatch(deleteOwnershipRequestSuccess(idPersistent))
            } else {
                dispatch(deleteOwnershipRequestError(idPersistent))
                if (rsp.error !== undefined) {
                    dispatch(addError(errorMessageFromApi(rsp.error)))
                }
            }
        } catch (e: unknown) {
            dispatch(deleteOwnershipRequestError(idPersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function parseOwnershipRequestFromJson(json: {
    [key: string]: unknown
}): OwnershipRequest {
    return {
        petitioner: parsePublicUserInfoFromJson(json['petitioner']),
        receiver: parsePublicUserInfoFromJson(json['receiver']),
        column: parseColumnsFromApi(json['column']),
        idPersistent: json['id_persistent'] as string
    }
}
