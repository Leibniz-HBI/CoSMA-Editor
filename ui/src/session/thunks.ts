import { config } from '../config'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { addError, addSuccessVanish } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    addEditSessionParticipantError,
    addEditSessionParticipantStart,
    addEditSessionParticipantSuccess,
    createEditSessionError,
    createEditSessionStart,
    createEditSessionSuccess,
    getEditSessionOwnerListError,
    getEditSessionOwnerListStart,
    getEditSessionOwnerListSuccess,
    getEditSessionParticipantListError,
    getEditSessionParticipantListStart,
    getEditSessionParticipantListSuccess,
    patchEditSessionError,
    patchEditSessionStart,
    patchEditSessionSuccess,
    removeEditSessionParticipantError,
    removeEditSessionParticipantStart,
    removeEditSessionParticipantSuccess,
    searchParticipantsError,
    searchParticipantsStart,
    searchParticipantsSuccess
} from './slice'
import {
    EditSessionParticipant,
    EditSessionParticipantType,
    newEditSession,
    newEditSessionParticipant
} from './state'

export function getEditSessionOwnerListThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getEditSessionOwnerListStart())
        try {
            const rsp = await fetch(config.api_path + '/edit_sessions/owner', {
                credentials: 'include'
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const editSessionList = json['edit_session_list'].map(
                    (session: unknown) => parseEditSessionFromApi(session)
                )
                dispatch(getEditSessionOwnerListSuccess(editSessionList))
            } else {
                dispatch(addError(errorMessageFromApi(json)))
                dispatch(getEditSessionOwnerListError())
            }
        } catch (e: unknown) {
            dispatch(getEditSessionOwnerListError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function getEditSessionParticipantListThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(getEditSessionParticipantListStart())
        try {
            const rsp = await fetch(config.api_path + '/edit_sessions/participant', {
                credentials: 'include'
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const editSessionList = json['edit_session_list'].map(
                    (session: unknown) => parseEditSessionFromApi(session)
                )
                dispatch(getEditSessionParticipantListSuccess(editSessionList))
            } else {
                dispatch(addError(errorMessageFromApi(json)))
                dispatch(getEditSessionParticipantListError())
            }
        } catch (e: unknown) {
            dispatch(getEditSessionParticipantListError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function addEditSessionParticipantThunk(
    idEditSessionPersistent: string,
    participant: EditSessionParticipant
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, fetch) => {
        dispatch(addEditSessionParticipantStart(participant.id))
        try {
            const rsp = await fetch(
                config.api_path +
                    `/edit_sessions/${idEditSessionPersistent}/participants`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    body: JSON.stringify({
                        type_participant: participant.type.toString().toUpperCase(),
                        id_participant: participant.id,
                        name_participant: participant.name
                    })
                }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(addEditSessionParticipantSuccess(participant))
                return true
            }
            dispatch(addEditSessionParticipantError(participant.id))
            dispatch(addError(errorMessageFromApi(json)))
        } catch (e: unknown) {
            dispatch(addEditSessionParticipantError(participant.id))
            dispatch(addError(exceptionMessage(e)))
        }
        return false
    }
}

export function searchEditSessionParticipantThunk(
    searchTerm: string
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(searchParticipantsStart())
        try {
            const rsp = await fetch(config.api_path + '/edit_sessions/search', {
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({ search_term: searchTerm })
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const results = json['search_result_list'].map((json: unknown) =>
                    parseEditSessionParticipant(json)
                )
                dispatch(searchParticipantsSuccess(results))
            } else {
                dispatch(searchParticipantsError())
                dispatch(addError(errorMessageFromApi(json)))
            }
        } catch (e: unknown) {
            dispatch(searchParticipantsError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function removeEditSessionParticipantThunk(
    idEditSession: string,
    participant: EditSessionParticipant
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, fetch) => {
        dispatch(removeEditSessionParticipantStart(participant))
        try {
            const rsp = await fetch(
                config.api_path + `/edit_sessions/${idEditSession}/participants`,
                {
                    credentials: 'include',
                    method: 'DELETE',
                    body: JSON.stringify({
                        id_participant: participant.id,
                        type_participant: participant.type.toString().toUpperCase()
                    })
                }
            )
            if (rsp.status == 200) {
                dispatch(removeEditSessionParticipantSuccess(participant))
                dispatch(
                    addSuccessVanish(
                        `Removed participant ${participant.name} from edit session`
                    )
                )
                return true
            }
            const json = await rsp.json()
            dispatch(removeEditSessionParticipantError(participant))
            dispatch(addError(errorMessageFromApi(json)))
        } catch (e: unknown) {
            dispatch(removeEditSessionParticipantError(participant))
            dispatch(addError(exceptionMessage(e)))
        }
        return false
    }
}

export function createEditSessionThunk(
    nameEditSession: string | undefined
): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(createEditSessionStart())
        try {
            const rsp = await fetch(config.api_path + '/edit_sessions', {
                credentials: 'include',
                method: 'PUT',
                body: JSON.stringify({ name: nameEditSession })
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const editSession = parseEditSessionFromApi(json)
                dispatch(createEditSessionSuccess(editSession))
            } else {
                dispatch(addError(errorMessageFromApi(json)))
                dispatch(createEditSessionError())
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(createEditSessionError())
        }
    }
}

export function patchEditSessionThunk({
    idEditSessionPersistent,
    name
}: {
    idEditSessionPersistent: string
    name: string
}): ThunkWithFetch<void> {
    return async (dispatch, _getState, fetch) => {
        dispatch(patchEditSessionStart())
        try {
            const rsp = await fetch(
                config.api_path + `/edit_sessions/${idEditSessionPersistent}`,
                {
                    credentials: 'include',
                    method: 'PATCH',
                    body: JSON.stringify({ name })
                }
            )
            const json = await rsp.json()
            if (rsp.status == 200) {
                const editSession = parseEditSessionFromApi(json)
                dispatch(patchEditSessionSuccess(editSession))
                dispatch(addSuccessVanish('Edit session name successfully changed.'))
            } else {
                dispatch(addError(errorMessageFromApi(json)))
                dispatch(patchEditSessionError())
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(patchEditSessionError())
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEditSessionFromApi(json: any) {
    const participantList = json['participant_list'].map((participant: unknown) =>
        parseEditSessionParticipant(participant)
    )
    return newEditSession({
        idPersistent: json['id_persistent'],
        name: json['name'],
        owner: parseEditSessionParticipant(json['owner']),
        participantList,
        participantMap: Object.fromEntries(
            participantList.map((entry: EditSessionParticipant, idx: number) => [
                entry.id,
                idx
            ])
        )
    })
}
const editSessionParticipantTypeMap: { [key: string]: EditSessionParticipantType } = {
    INTERNAL: EditSessionParticipantType.internal,
    ORCID: EditSessionParticipantType.orcid
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEditSessionParticipant(json: any): EditSessionParticipant {
    return newEditSessionParticipant({
        id: json['id_participant'],
        type: editSessionParticipantTypeMap[json['type_participant']],
        name: json['name_participant'] ?? undefined
    })
}
