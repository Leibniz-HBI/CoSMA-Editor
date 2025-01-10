import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'
import {
    EditSession,
    EditSessionParticipantType,
    newEditSession,
    newEditSessionParticipant
} from './state'
import { newRemote } from '../util/state'

function selectEditSessionState(state: RootState) {
    return state.editSession
}

export const selectEditSessionOwnerList = createSelector(
    selectEditSessionState,
    (state) => state.editSessionOwnerList
)
export const selectEditSessionParticipantList = createSelector(
    selectEditSessionState,
    (state) => state.editSessionParticipantList
)
export const selectCurrentEditSession = createSelector(
    selectEditSessionState,
    (state) => state.currentEditSession
)

export const selectIdCurrentEditSessionPersistent = createSelector(
    selectCurrentEditSession,
    (session) => session.value?.idPersistent
)

export const selectCurrentEditSessionParticipantList = createSelector(
    selectCurrentEditSession,
    (state) => state.value?.participantList
)

export const selectEditSessionParticipantNumber = createSelector(
    selectCurrentEditSessionParticipantList,
    (state) => state?.length ?? 0
)

export const selectParticipantSearchResults = createSelector(
    selectEditSessionState,
    (state) => state.participantSearchResults
)

export const selectedEditSessionParticipantIds = createSelector(
    selectCurrentEditSession,
    (session) =>
        Object.fromEntries(
            (session.value?.participantList ?? []).map((participant) => [
                participant.id,
                true
            ])
        )
)

export const selectAddEditSessionParticipant = createSelector(
    selectEditSessionState,
    (state) => state.addEditSessionParticipant
)

export const selectCurrentEditSessionName = createSelector(
    selectCurrentEditSession,
    (session) => session.value?.name
)

export const selectShowEditSessionList = createSelector(
    selectEditSessionState,
    (state) => state.showEditSessionList
)

export const makeSelectEditSessionByIdPersistent = () => {
    const selector = createSelector(
        [
            selectEditSessionOwnerList,
            selectEditSessionParticipantList,
            (_state, idPersistent) => idPersistent
        ],
        (ownerList, participantList, id_persistent) => {
            if (ownerList.value === undefined || participantList.value === undefined) {
                return newRemote(
                    undefined,
                    ownerList.isLoading || participantList.isLoading
                )
            }
            const predicate = (session: EditSession) =>
                session.idPersistent == id_persistent
            const editSession =
                ownerList.value?.find(predicate) ??
                participantList.value?.find(predicate)
            return newRemote(
                editSession,
                false,
                editSession === undefined
                    ? 'No edit session with this id exists.'
                    : undefined
            )
        }
    )
    return selector
}
