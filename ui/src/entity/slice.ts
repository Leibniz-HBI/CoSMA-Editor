import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { EntityDetails, EntityDetailsState, newEntityDetailsState } from './state'
import { newRemote } from '../util/state'

const slice = createSlice({
    initialState: newEntityDetailsState({}),
    name: 'entityDetails',
    reducers: {
        getEntityDetailsError(state: EntityDetailsState) {
            state.entityDetails.isLoading = false
        },
        getEntityDetailsStart(state: EntityDetailsState) {
            state.entityDetails.isLoading = true
        },
        getEntityDetailsSuccess(
            state: EntityDetailsState,
            action: PayloadAction<EntityDetails>
        ) {
            state.entityDetails = newRemote(action.payload)
        },
        setShowDetailsForEntityWithIdPersistent(
            state: EntityDetailsState,
            action: PayloadAction<string | undefined>
        ) {
            state.showEntityDetails = action.payload
        }
    }
})

export const entityDetailsReducer = slice.reducer

export const {
    getEntityDetailsError,
    getEntityDetailsStart,
    getEntityDetailsSuccess,
    setShowDetailsForEntityWithIdPersistent
} = slice.actions
