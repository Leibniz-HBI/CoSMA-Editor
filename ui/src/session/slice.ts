import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    EditSession,
    EditSessionParticipant,
    EditSessionState,
    newEditSessionState
} from './state'
import { newRemote } from '../util/state'

const editSessionSlice = createSlice({
    name: 'editSession',
    initialState: newEditSessionState({}),
    reducers: {
        setShowEditSessionList(
            state: EditSessionState,
            action: PayloadAction<boolean>
        ) {
            state.showEditSessionList = action.payload
        },
        setCurrentEditSession(
            state: EditSessionState,
            action: PayloadAction<EditSession>
        ) {
            state.currentEditSession.value = action.payload
        },
        getEditSessionOwnerListStart(state: EditSessionState) {
            state.editSessionOwnerList.isLoading = true
        },
        getEditSessionOwnerListSuccess(
            state: EditSessionState,
            action: PayloadAction<EditSession[]>
        ) {
            state.editSessionOwnerList.isLoading = false
            state.editSessionOwnerList.value = action.payload
            state.editSessionOwnerMap = Object.fromEntries(
                action.payload.map((session, idx) => [session.idPersistent, idx])
            )
        },
        getEditSessionOwnerListError(state: EditSessionState) {
            state.editSessionOwnerList.isLoading = false
        },
        getEditSessionParticipantListStart(state: EditSessionState) {
            state.editSessionParticipantList.isLoading = true
        },
        getEditSessionParticipantListSuccess(
            state: EditSessionState,
            action: PayloadAction<EditSession[]>
        ) {
            state.editSessionParticipantList.isLoading = false
            state.editSessionParticipantList.value = action.payload
            state.editSessionParticipantMap = Object.fromEntries(
                action.payload.map((session, idx) => [session.idPersistent, idx])
            )
        },
        getEditSessionParticipantListError(state: EditSessionState) {
            state.editSessionParticipantList.isLoading = false
        },
        searchParticipantsStart(state: EditSessionState) {
            state.participantSearchResults.isLoading = true
        },
        searchParticipantsSuccess(
            state: EditSessionState,
            action: PayloadAction<EditSessionParticipant[]>
        ) {
            state.participantSearchResults.isLoading = false
            state.participantSearchResults.value = action.payload
        },
        searchParticipantsError(state: EditSessionState) {
            state.participantSearchResults.isLoading = false
        },
        addEditSessionParticipantStart(
            state: EditSessionState,
            action: PayloadAction<string>
        ) {
            state.addEditSessionParticipant = newRemote(action.payload, true)
        },
        addEditSessionParticipantSuccess(
            state: EditSessionState,
            action: PayloadAction<EditSessionParticipant>
        ) {
            const currentEditSession = state.currentEditSession.value
            if (currentEditSession !== undefined) {
                currentEditSession.participantMap[action.payload.id] =
                    currentEditSession.participantList.length

                currentEditSession.participantList?.push(action.payload)
            }
            if (action.payload.id == state.addEditSessionParticipant.value) {
                state.addEditSessionParticipant = newRemote(undefined)
            }
        },
        addEditSessionParticipantError(
            state: EditSessionState,
            action: PayloadAction<string>
        ) {
            if (action.payload == state.addEditSessionParticipant.value) {
                state.addEditSessionParticipant = newRemote(undefined)
            }
        },
        clearParticipantSearchResults(state: EditSessionState) {
            state.participantSearchResults.value = []
        },
        removeEditSessionParticipantStart(
            state: EditSessionState,
            action: PayloadAction<EditSessionParticipant>
        ) {
            state.removeEditSessionParticipant = newRemote(action.payload, true)
        },
        removeEditSessionParticipantSuccess(
            state: EditSessionState,
            action: PayloadAction<EditSessionParticipant>
        ) {
            const idParticipant = action.payload.id
            const currentEditSession = state.currentEditSession.value
            if (currentEditSession !== undefined) {
                const idx = currentEditSession?.participantMap[idParticipant]
                if (idx !== undefined) {
                    currentEditSession?.participantList.splice(idx, 1)
                    currentEditSession.participantMap = Object.fromEntries(
                        currentEditSession.participantList.map((participant, idx) => [
                            participant.id,
                            idx
                        ])
                    )
                }
            }
            if (state.removeEditSessionParticipant.value?.id == idParticipant) {
                state.removeEditSessionParticipant = newRemote(undefined)
            }
            const idxParticipant = state.editSessionParticipantMap[action.payload.id]
            if (idParticipant !== undefined) {
                state.editSessionParticipantList.value?.splice(idxParticipant, 1)
                state.editSessionParticipantMap = Object.fromEntries(
                    (state.editSessionParticipantList.value ?? []).map(
                        (session, idx) => [session.idPersistent, idx]
                    )
                )
            }
        },
        removeEditSessionParticipantError(
            state: EditSessionState,
            action: PayloadAction<EditSessionParticipant>
        ) {
            const idParticipant = action.payload.id
            if (state.removeEditSessionParticipant.value?.id == idParticipant) {
                state.removeEditSessionParticipant = newRemote(undefined)
            }
        },
        createEditSessionStart(state: EditSessionState) {
            state.currentEditSession.isLoading = true
        },
        createEditSessionSuccess(
            state: EditSessionState,
            action: PayloadAction<EditSession>
        ) {
            state.currentEditSession = newRemote(action.payload)
            const editSessionOwnerList = state.editSessionOwnerList.value
            if (editSessionOwnerList !== undefined) {
                state.editSessionOwnerMap[action.payload.idPersistent] =
                    editSessionOwnerList.length
                editSessionOwnerList.push(action.payload)
            }
        },
        createEditSessionError(state: EditSessionState) {
            state.currentEditSession.isLoading = false
        },
        patchEditSessionStart(state: EditSessionState) {
            state.currentEditSession.isLoading = true
        },
        patchEditSessionSuccess(
            state: EditSessionState,
            action: PayloadAction<EditSession>
        ) {
            state.currentEditSession = newRemote(action.payload)
        },
        patchEditSessionError(state: EditSessionState) {
            state.currentEditSession.isLoading = false
        }
    }
})

export const editSessionReducer = editSessionSlice.reducer

export const {
    addEditSessionParticipantStart,
    addEditSessionParticipantSuccess,
    addEditSessionParticipantError,
    setShowEditSessionList,
    setCurrentEditSession,
    getEditSessionOwnerListStart,
    getEditSessionOwnerListSuccess,
    getEditSessionOwnerListError,
    getEditSessionParticipantListError,
    getEditSessionParticipantListStart,
    getEditSessionParticipantListSuccess,
    searchParticipantsStart,
    searchParticipantsSuccess,
    searchParticipantsError,
    clearParticipantSearchResults,
    removeEditSessionParticipantError,
    removeEditSessionParticipantStart,
    removeEditSessionParticipantSuccess,
    createEditSessionError,
    createEditSessionStart,
    createEditSessionSuccess,
    patchEditSessionError,
    patchEditSessionStart,
    patchEditSessionSuccess
} = editSessionSlice.actions
