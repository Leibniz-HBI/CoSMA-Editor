import {
    cosmaeEditSessionApiDeleteParticipant,
    cosmaeEditSessionApiGetEditSessionsOwner,
    cosmaeEditSessionApiGetEditSessionsParticipant,
    cosmaeEditSessionApiPatchEditSession,
    cosmaeEditSessionApiPutEditSession,
    cosmaeEditSessionApiPutParticipant,
    cosmaeEditSessionApiSearchParticipants,
    EditSession,
    EditSessionParticipantWithName
} from '../openapi/cosmae'
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
    return async (dispatch, _getState, _fetch) => {
        dispatch(getEditSessionOwnerListStart())
        try {
            const rsp = await cosmaeEditSessionApiGetEditSessionsOwner({})
            if (rsp.data) {
                const editSessionList = rsp.data.edit_session_list.map(
                    (session) => parseEditSessionFromApi(session)
                )
                dispatch(getEditSessionOwnerListSuccess(editSessionList))
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
                dispatch(getEditSessionOwnerListError())
            }
        } catch (e: unknown) {
            dispatch(getEditSessionOwnerListError())
            dispatch(addError(exceptionMessage(e)))
        }
    }
}

export function getEditSessionParticipantListThunk(): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(getEditSessionParticipantListStart())
        try {
            const rsp = await cosmaeEditSessionApiGetEditSessionsParticipant({})
            if (rsp.data) {
                const editSessionList = rsp.data.edit_session_list.map(
                    (session) => parseEditSessionFromApi(session)
                )
                dispatch(getEditSessionParticipantListSuccess(editSessionList))
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
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
    return async (dispatch, _getState, _fetch) => {
        dispatch(addEditSessionParticipantStart(participant.id))
        try {
            const rsp = await cosmaeEditSessionApiPutParticipant({
                path: { id_edit_session_persistent: idEditSessionPersistent },
                body: {
                    type_participant: participant.type.toString().toUpperCase(),
                    id_participant: participant.id,
                    name_participant: participant.name
                }
            })
            if (rsp.data) {
                dispatch(addEditSessionParticipantSuccess(participant))
                return true
            }
            dispatch(addEditSessionParticipantError(participant.id))
            dispatch(addError(errorMessageFromApi(rsp.error)))
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
    return async (dispatch, _getState, _fetch) => {
        dispatch(searchParticipantsStart())
        try {
            const rsp = await cosmaeEditSessionApiSearchParticipants({
                body: { search_term: searchTerm }
            })
            if (rsp.data) {
                const results = rsp.data['search_result_list'].map((participant) =>
                    parseEditSessionParticipant(participant)
                )
                dispatch(searchParticipantsSuccess(results))
            } else {
                dispatch(searchParticipantsError())
                dispatch(addError(errorMessageFromApi(rsp.error)))
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
    return async (dispatch, _getState, _fetch) => {
        dispatch(removeEditSessionParticipantStart(participant))
        try {
            const rsp = await cosmaeEditSessionApiDeleteParticipant({
                path: { id_edit_session_persistent: idEditSession },
                body: {
                    id_participant: participant.id,
                    type_participant: participant.type.toString().toUpperCase()
                }
            })
            if (!rsp.error) {
                dispatch(removeEditSessionParticipantSuccess(participant))
                dispatch(
                    addSuccessVanish(
                        `Removed participant ${participant.name} from edit session`
                    )
                )
                return true
            }
            dispatch(removeEditSessionParticipantError(participant))
            dispatch(addError(errorMessageFromApi(rsp.error)))
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
    return async (dispatch, _getState, _fetch) => {
        dispatch(createEditSessionStart())
        try {
            const rsp = await cosmaeEditSessionApiPutEditSession({
                body: { name: nameEditSession }
            })
            if (rsp.data) {
                const editSession = parseEditSessionFromApi(rsp.data)
                dispatch(createEditSessionSuccess(editSession))
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
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
    return async (dispatch, _getState, _fetch) => {
        dispatch(patchEditSessionStart())
        try {
            const rsp = await cosmaeEditSessionApiPatchEditSession({
                path: { id_edit_session_persistent: idEditSessionPersistent },
                body: { name }
            })
            if (rsp.data) {
                const editSession = parseEditSessionFromApi(rsp.data)
                dispatch(patchEditSessionSuccess(editSession))
                dispatch(addSuccessVanish('Edit session name successfully changed.'))
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
                dispatch(patchEditSessionError())
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(patchEditSessionError())
        }
    }
}

export function parseEditSessionFromApi(session: EditSession) {
    const participantList = session['participant_list'].map((participant) =>
        parseEditSessionParticipant(participant)
    )
    return newEditSession({
        idPersistent: session['id_persistent'],
        name: session['name'],
        owner: parseEditSessionParticipant(session.owner),
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

export function parseEditSessionParticipant(
    participant: EditSessionParticipantWithName
): EditSessionParticipant {
    return newEditSessionParticipant({
        id: participant['id_participant'],
        type: editSessionParticipantTypeMap[participant['type_participant']],
        name: participant['name_participant']
    })
}
