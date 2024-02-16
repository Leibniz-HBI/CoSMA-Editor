import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    MergeRequest,
    MergeRequestState,
    newMergeRequestByCategory,
    newMergeRequestState
} from './state'
import { newRemote } from '../util/state'

const tagMergeRequestSlice = createSlice({
    name: 'tagMergeRequest',
    initialState: newMergeRequestState({}),
    reducers: {
        getMergeRequestsSuccess: (
            state: MergeRequestState,
            action: PayloadAction<{ created: MergeRequest[]; assigned: MergeRequest[] }>
        ) => {
            state.byCategory = newRemote(
                newMergeRequestByCategory({
                    assigned: action.payload.assigned,
                    created: action.payload.created
                })
            )
        },
        getMergeRequestsStart: (state: MergeRequestState) => {
            state.byCategory.isLoading = true
        },
        getMergeRequestsError: (state: MergeRequestState) => {
            state.byCategory.isLoading = false
        }
    }
})

export const tagMergeRequestsReducer = tagMergeRequestSlice.reducer

export const { getMergeRequestsStart, getMergeRequestsSuccess, getMergeRequestsError } =
    tagMergeRequestSlice.actions
