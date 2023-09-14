import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { newRemote } from '../util/state'
import { OwnershipRequest, PutOwnershipRequest, TagManagementState } from './state'

export interface OwnershipRequestsPayload {
    petitioned: OwnershipRequest[]
    received: OwnershipRequest[]
}

const initialState: TagManagementState = {
    ownershipRequests: { value: { petitioned: [], received: [] }, isLoading: false },
    putOwnershipRequest: { value: undefined, isLoading: false }
}

export const tagManagementSlice = createSlice({
    name: 'tagManagement',
    initialState,
    reducers: {
        getOwnershipRequestsStart(state: TagManagementState) {
            state.ownershipRequests = newRemote(state.ownershipRequests.value, true)
        },
        getOwnershipRequestsSuccess(
            state: TagManagementState,
            action: PayloadAction<OwnershipRequestsPayload>
        ) {
            state.ownershipRequests = newRemote({
                petitioned: action.payload.petitioned.map((request) =>
                    newRemote(request)
                ),
                received: action.payload.received.map((request) => newRemote(request))
            })
        },
        getOwnershipRequestsError(
            state: TagManagementState,
            action: PayloadAction<string>
        ) {
            state.ownershipRequests.errorMsg = action.payload
        },
        putOwnershipRequestStart(
            state: TagManagementState,
            action: PayloadAction<PutOwnershipRequest>
        ) {
            state.putOwnershipRequest = { value: action.payload, isLoading: true }
        },
        putOwnershipRequestSuccess(state, action: PayloadAction<PutOwnershipRequest>) {
            if (checkOwnershipRequestMatch(state, action)) {
                state.putOwnershipRequest.isLoading = false
            }
        },
        putOwnerShipRequestError(
            state,
            action: PayloadAction<PutOwnershipRequest & { msg: string }>
        ) {
            if (checkOwnershipRequestMatch(state, action)) {
                state.putOwnershipRequest.errorMsg = action.payload.msg
                state.putOwnershipRequest.isLoading = false
            }
        },
        putOwnershipRequestErrorClear(
            state,
            action: PayloadAction<PutOwnershipRequest>
        ) {
            if (checkOwnershipRequestMatch(state, action)) {
                state.putOwnershipRequest = newRemote(undefined)
            }
        },
        putOwnershipRequestClear(state) {
            state.putOwnershipRequest = newRemote(undefined)
        },
        acceptOwnershipRequestStart(state, action: PayloadAction<string>) {
            const idx = state.ownershipRequests.value.received.findIndex(
                (request) => request.value.idPersistent == action.payload
            )
            if (idx < 0) {
                return
            }
            state.ownershipRequests.value.received[idx].isLoading = true
        },
        acceptOwnershipRequestSuccess(state, action: PayloadAction<string>) {
            const idx = state.ownershipRequests.value.received.findIndex(
                (request) => request.value.idPersistent == action.payload
            )
            if (idx < 0) {
                return
            }
            state.ownershipRequests.value.received.splice(idx, 1)
        },
        acceptOwnershipRequestError(
            state,
            action: PayloadAction<{ idPersistent: string; msg: string }>
        ) {
            const idx = state.ownershipRequests.value.received.findIndex(
                (request) => request.value.idPersistent == action.payload.idPersistent
            )
            if (idx < 0) {
                return
            }
            const ownershipRequest = state.ownershipRequests.value.received[idx]
            ownershipRequest.isLoading = false
            ownershipRequest.errorMsg = action.payload.msg
        },
        deleteOwnershipRequestStart(state, action: PayloadAction<string>) {
            const idx = state.ownershipRequests.value.petitioned.findIndex(
                (request) => request.value.idPersistent == action.payload
            )
            if (idx < 0) {
                return
            }
            state.ownershipRequests.value.petitioned[idx].isLoading = true
        },
        deleteOwnershipRequestSuccess(state, action: PayloadAction<string>) {
            const idx = state.ownershipRequests.value.petitioned.findIndex(
                (request) => request.value.idPersistent == action.payload
            )
            if (idx < 0) {
                return
            }
            state.ownershipRequests.value.petitioned.splice(idx, 1)
        },
        deleteOwnershipRequestError(
            state,
            action: PayloadAction<{ idPersistent: string; msg: string }>
        ) {
            const idx = state.ownershipRequests.value.petitioned.findIndex(
                (request) => request.value.idPersistent == action.payload.idPersistent
            )
            if (idx < 0) {
                return
            }
            const ownershipRequest = state.ownershipRequests.value.petitioned[idx]
            ownershipRequest.isLoading = false
            ownershipRequest.errorMsg = action.payload.msg
        }
    }
})

export const {
    getOwnershipRequestsStart,
    getOwnershipRequestsSuccess,
    getOwnershipRequestsError,
    putOwnershipRequestStart,
    putOwnershipRequestSuccess,
    putOwnerShipRequestError,
    putOwnershipRequestErrorClear,
    putOwnershipRequestClear,
    acceptOwnershipRequestStart,
    acceptOwnershipRequestSuccess,
    acceptOwnershipRequestError,
    deleteOwnershipRequestStart,
    deleteOwnershipRequestSuccess,
    deleteOwnershipRequestError
} = tagManagementSlice.actions

export default tagManagementSlice.reducer
function checkOwnershipRequestMatch(
    state: TagManagementState,
    action: { payload: PutOwnershipRequest; type: string }
) {
    const stateOwnerShipRequestValue = state.putOwnershipRequest.value
    return (
        stateOwnerShipRequestValue?.idTagDefinitionPersistent ==
            action.payload.idTagDefinitionPersistent &&
        stateOwnerShipRequestValue.idUserPersistent == action.payload.idUserPersistent
    )
}
