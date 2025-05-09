import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { newRemote } from '../util/state'
import { OwnershipRequest, PutOwnershipRequest, ColumnManagementState } from './state'

export interface OwnershipRequestsPayload {
    petitioned: OwnershipRequest[]
    received: OwnershipRequest[]
}

const initialState: ColumnManagementState = {
    ownershipRequests: { value: { petitioned: [], received: [] }, isLoading: false },
    putOwnershipRequest: { value: undefined, isLoading: false }
}

const columnManagementSlice = createSlice({
    name: 'columnManagement',
    initialState,
    reducers: {
        getOwnershipRequestsStart(state: ColumnManagementState) {
            state.ownershipRequests = newRemote(state.ownershipRequests.value, true)
        },
        getOwnershipRequestsSuccess(
            state: ColumnManagementState,
            action: PayloadAction<OwnershipRequestsPayload>
        ) {
            state.ownershipRequests = newRemote({
                petitioned: action.payload.petitioned.map((request) =>
                    newRemote(request)
                ),
                received: action.payload.received.map((request) => newRemote(request))
            })
        },
        getOwnershipRequestsError(state: ColumnManagementState) {
            state.ownershipRequests.isLoading = false
        },
        putOwnershipRequestStart(
            state: ColumnManagementState,
            action: PayloadAction<PutOwnershipRequest>
        ) {
            state.putOwnershipRequest = { value: action.payload, isLoading: true }
        },
        putOwnershipRequestSuccess(state, action: PayloadAction<PutOwnershipRequest>) {
            if (checkOwnershipRequestMatch(state, action)) {
                state.putOwnershipRequest.isLoading = false
            }
        },
        putOwnerShipRequestError(state, action: PayloadAction<PutOwnershipRequest>) {
            if (checkOwnershipRequestMatch(state, action)) {
                // Still need to keep error here for showing correct icon in UI.
                state.putOwnershipRequest.errorMsg = 'error'
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
        acceptOwnershipRequestError(state, action: PayloadAction<string>) {
            const idx = state.ownershipRequests.value.received.findIndex(
                (request) => request.value.idPersistent == action.payload
            )
            if (idx < 0) {
                return
            }
            const ownershipRequest = state.ownershipRequests.value.received[idx]
            ownershipRequest.isLoading = false
            // Still need to keep error here for showing correct icon in UI.
            ownershipRequest.errorMsg = 'error'
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
        deleteOwnershipRequestError(state, action: PayloadAction<string>) {
            const idx = state.ownershipRequests.value.petitioned.findIndex(
                (request) => request.value.idPersistent == action.payload
            )
            if (idx < 0) {
                return
            }
            const ownershipRequest = state.ownershipRequests.value.petitioned[idx]
            ownershipRequest.isLoading = false
            // Still need to keep error here for showing correct icon in UI.
            ownershipRequest.errorMsg = 'error'
        }
    }
})

export const columnManagementReducer = columnManagementSlice.reducer

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
} = columnManagementSlice.actions

export default columnManagementSlice.reducer
function checkOwnershipRequestMatch(
    state: ColumnManagementState,
    action: { payload: PutOwnershipRequest; type: string }
) {
    const stateOwnerShipRequestValue = state.putOwnershipRequest.value
    return (
        stateOwnerShipRequestValue?.idColumnPersistent ==
            action.payload.idColumnPersistent &&
        stateOwnerShipRequestValue.idUserPersistent == action.payload.idUserPersistent
    )
}
