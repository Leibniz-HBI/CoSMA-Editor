import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    EntityDetails,
    EntityDetailsState,
    EntitySearchResult,
    newEntityDetailsState
} from './state'
import { newRemote } from '../util/state'
import { Entity } from './state'

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
        },
        clearEntitySearchResults(state: EntityDetailsState) {
            state.entitySearchResults = newRemote(undefined)
        },
        getEntitySearchResultsError(state: EntityDetailsState) {
            state.entitySearchResults = newRemote(undefined)
        },
        getEntitySearchResultsStart(state: EntityDetailsState) {
            state.entitySearchResults.isLoading = true
        },
        getEntitySearchResultsSuccess(
            state: EntityDetailsState,
            action: PayloadAction<EntitySearchResult[]>
        ) {
            state.entitySearchResults = newRemote(action.payload)
        },
        getEntityError(state: EntityDetailsState, action: PayloadAction<string>) {
            const existing = state.entityByIdPersistentMap[action.payload]
            if (existing !== undefined) {
                existing.isLoading = false
            }
        },
        getEntityStart(state: EntityDetailsState, action: PayloadAction<string>) {
            const existing = state.entityByIdPersistentMap[action.payload]
            if (existing !== undefined) {
                existing.isLoading = true
            } else {
                state.entityByIdPersistentMap[action.payload] = newRemote(
                    undefined,
                    true
                )
            }
        },
        getEntitySuccess(state: EntityDetailsState, action: PayloadAction<Entity>) {
            state.entityByIdPersistentMap[action.payload.idPersistent] = newRemote(
                action.payload
            )
        }
    }
})

export const entityDetailsReducer = slice.reducer

export const {
    clearEntitySearchResults,
    getEntityDetailsError,
    getEntityDetailsStart,
    getEntityDetailsSuccess,
    getEntityError,
    getEntityStart,
    getEntitySuccess,
    getEntitySearchResultsError,
    getEntitySearchResultsStart,
    getEntitySearchResultsSuccess,
    setShowDetailsForEntityWithIdPersistent
} = slice.actions
