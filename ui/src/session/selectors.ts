import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

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
