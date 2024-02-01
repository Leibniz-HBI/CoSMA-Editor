import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { newRemote } from '../../util/state'
import { EntityMergeRequest } from './state'
import { EntityMergeRequestState } from './state'

const initialState: EntityMergeRequestState = {
    entityMergeRequests: newRemote(undefined)
}

const entityMergeRequestSlice = createSlice({
    name: 'entityMergeRequest',
    initialState,
    reducers: {
        getEntityMergeRequestStart(state: EntityMergeRequestState) {
            state.entityMergeRequests.isLoading = true
        },
        getEntityMergeRequestsSuccess(
            state: EntityMergeRequestState,
            action: PayloadAction<EntityMergeRequest[]>
        ) {
            state.entityMergeRequests = newRemote(action.payload)
        },
        getEntityMergeRequestsError(state: EntityMergeRequestState) {
            state.entityMergeRequests.isLoading = false
        }
    }
})

export const entityMergeRequestsReducer = entityMergeRequestSlice.reducer

export const {
    getEntityMergeRequestStart,
    getEntityMergeRequestsSuccess,
    getEntityMergeRequestsError
} = entityMergeRequestSlice.actions
