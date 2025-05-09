import { Column } from '../column_menu/state'
import { parseColumnsFromApi } from '../column_menu/thunks'
import { config } from '../config'
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
    return async (dispatch, _getState, fetch) => {
        dispatch(getOwnershipRequestsStart())
        try {
            const rsp = await fetch(
                config.api_path + '/columns/permissions/ownership_requests',
                { method: 'GET', credentials: 'include' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(
                    getOwnershipRequestsSuccess({
                        petitioned: json['petitioned'].map(
                            parseOwnershipRequestFromJson
                        ),
                        received: json['received'].map(parseOwnershipRequestFromJson)
                    })
                )
            } else {
                dispatch(getOwnershipRequestsError())
                dispatch(addError(json['msg']))
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
    return async (dispatch, _getState, fetch) => {
        dispatch(putOwnershipRequestStart(args))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/columns/permissions/${args.idColumnPersistent}/owner/${args.idUserPersistent}`,
                { credentials: 'include', method: 'POST' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(putOwnershipRequestSuccess(args))
                if (json !== undefined && json !== null) {
                    return parseColumnsFromApi(json)
                }
            } else {
                dispatch(putOwnerShipRequestError(args))
                dispatch(addError(errorMessageFromApi(json)))
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
    return async (dispatch, _getState, fetch) => {
        dispatch(acceptOwnershipRequestStart(idPersistent))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/columns/permissions/owner/${idPersistent}/accept`,
                { credentials: 'include', method: 'POST' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(acceptOwnershipRequestSuccess(idPersistent))
                return parseColumnsFromApi(json)
            }
            dispatch(acceptOwnershipRequestError(idPersistent))
            dispatch(addError(errorMessageFromApi(json)))
        } catch (e: unknown) {
            dispatch(acceptOwnershipRequestError(idPersistent))
            dispatch(addError(exceptionMessage(e)))
        }
    }
}
export function deleteOwnershipRequest(idPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(deleteOwnershipRequestStart(idPersistent))
        try {
            const rsp = await fetch(
                config.api_path + `/columns/permissions/owner/${idPersistent}`,
                { credentials: 'include', method: 'DELETE' }
            )
            if (rsp.status == 200) {
                dispatch(deleteOwnershipRequestSuccess(idPersistent))
            } else {
                const json = await rsp.json()
                dispatch(deleteOwnershipRequestError(idPersistent))
                dispatch(addError(errorMessageFromApi(json)))
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
