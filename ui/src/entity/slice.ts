import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
    EntityDetails,
    EntityDetailsState,
    EntitySearchResult,
    newEntityDetailsState
} from './state'
import { newRemote } from '../util/state'
import { Entity } from './state'
import { mkUpUntilSinceEpochColumnId } from '../util/misc'
import { Comment } from '../comments/slice'

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
        getEntityError(state: EntityDetailsState, action: PayloadAction<string[]>) {
            for (const idPersistent of action.payload) {
                const existing = state.entityByIdPersistentMap[idPersistent]
                if (existing !== undefined) {
                    existing.isLoading = false
                }
            }
        },
        getEntityStart(
            state: EntityDetailsState,
            action: PayloadAction<{
                idEntityPersistentList: string[]
                upUntilSinceEpoch: number | undefined
            }>
        ) {
            const { idEntityPersistentList, upUntilSinceEpoch } = action.payload
            for (const idEntityPersistent of idEntityPersistentList) {
                const keyWithDate = mkUpUntilSinceEpochColumnId(
                    idEntityPersistent,
                    upUntilSinceEpoch
                )
                const existing = state.entityByIdPersistentMap[keyWithDate]
                if (existing !== undefined) {
                    existing.isLoading = true
                } else {
                    state.entityByIdPersistentMap[keyWithDate] = newRemote(
                        undefined,
                        true
                    )
                }
            }
        },
        getEntitySuccess(
            state: EntityDetailsState,
            action: PayloadAction<{
                entity: Entity
                upUntilSinceEpoch: number | undefined
            }>
        ) {
            const { entity, upUntilSinceEpoch } = action.payload
            const keyWithUpUntilTime = mkUpUntilSinceEpochColumnId(
                entity.idPersistent,
                upUntilSinceEpoch
            )
            state.entityByIdPersistentMap[keyWithUpUntilTime] = newRemote(entity)
        },
        submitEntityJustificationStart(state: EntityDetailsState) {
            state.submitJustification.isLoading = true
        },
        submitEntityJustificationSuccess(
            state: EntityDetailsState,
            action: PayloadAction<
                { idEntityPersistent: string; comment: Comment } | undefined
            >
        ) {
            state.submitJustification.isLoading = false
            if (action.payload !== undefined) {
                const entity =
                    state.entityByIdPersistentMap[action.payload.idEntityPersistent]
                if (entity !== undefined && entity.value !== undefined) {
                    entity.value.justificationTxt = action.payload.comment.content
                }
            }
        },
        submitEntityJustificationError(state: EntityDetailsState) {
            state.submitJustification.isLoading = false
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
    setShowDetailsForEntityWithIdPersistent,
    submitEntityJustificationStart,
    submitEntityJustificationError,
    submitEntityJustificationSuccess
} = slice.actions
