import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    MergeRequest,
    MergeRequestState,
    newMergeRequestByCategory,
    newMergeRequestState
} from './state'
import { newRemote } from '../util/state'
import { StatementSync } from 'node:sqlite'

const columnMergeRequestSlice = createSlice({
    name: 'columnMergeRequest',
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

export const columnMergeRequestsReducer = columnMergeRequestSlice.reducer

export const { getMergeRequestsStart, getMergeRequestsSuccess, getMergeRequestsError } =
    columnMergeRequestSlice.actions
