import { TagDefinition } from '../column_menu/state'
import { parseColumnDefinitionsFromApi } from '../column_menu/thunks'
import { config } from '../config'
import { parsePublicUserInfoFromJson } from '../user/thunks'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
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
                config.api_path + '/tags/definitions/permissions/ownership_requests',
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
                dispatch(getOwnershipRequestsError(json['msg']))
            }
        } catch (e: unknown) {
            dispatch(getOwnershipRequestsError)
        }
    }
}

export function putOwnershipRequest(
    args: PutOwnershipRequest
): ThunkWithFetch<TagDefinition | undefined> {
    return async (dispatch, _getState, fetch) => {
        dispatch(putOwnershipRequestStart(args))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/tags/definitions/permissions/${args.idTagDefinitionPersistent}/owner/${args.idUserPersistent}`,
                { credentials: 'include', method: 'POST' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(putOwnershipRequestSuccess(args))
                if (json !== undefined && json !== null) {
                    return parseColumnDefinitionsFromApi(json)
                }
            } else {
                dispatch(
                    putOwnerShipRequestError({
                        ...args,
                        msg: errorMessageFromApi(json)
                    })
                )
            }
        } catch (e: unknown) {
            dispatch(putOwnerShipRequestError({ ...args, msg: exceptionMessage(e) }))
        }
    }
}
export function acceptOwnershipRequest(
    idPersistent: string
): ThunkWithFetch<TagDefinition | undefined> {
    return async (dispatch, _getState, fetch) => {
        dispatch(acceptOwnershipRequestStart(idPersistent))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/tags/definitions/permissions/owner/${idPersistent}/accept`,
                { credentials: 'include', method: 'POST' }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(acceptOwnershipRequestSuccess(idPersistent))
                return parseColumnDefinitionsFromApi(json)
            }
            dispatch(
                acceptOwnershipRequestError({
                    idPersistent,
                    msg: errorMessageFromApi(json)
                })
            )
        } catch (e: unknown) {
            dispatch(
                acceptOwnershipRequestError({ idPersistent, msg: exceptionMessage(e) })
            )
        }
    }
}
export function deleteOwnershipRequest(idPersistent: string): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(deleteOwnershipRequestStart(idPersistent))
        try {
            const rsp = await fetch(
                config.api_path + `/tags/definitions/permissions/owner/${idPersistent}`,
                { credentials: 'include', method: 'DELETE' }
            )
            if (rsp.status == 200) {
                dispatch(deleteOwnershipRequestSuccess(idPersistent))
            } else {
                const json = await rsp.json()
                dispatch(
                    deleteOwnershipRequestError({
                        idPersistent,
                        msg: errorMessageFromApi(json)
                    })
                )
            }
        } catch (e: unknown) {
            dispatch(
                deleteOwnershipRequestError({ idPersistent, msg: exceptionMessage(e) })
            )
        }
    }
}

export function parseOwnershipRequestFromJson(json: {
    [key: string]: unknown
}): OwnershipRequest {
    return {
        petitioner: parsePublicUserInfoFromJson(json['petitioner']),
        receiver: parsePublicUserInfoFromJson(json['receiver']),
        tagDefinition: parseColumnDefinitionsFromApi(json['tag_definition']),
        idPersistent: json['id_persistent'] as string
    }
}
