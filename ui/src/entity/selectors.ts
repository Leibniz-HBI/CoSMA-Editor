import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

export function selectEntityDetailsState(state: RootState) {
    return state.entityDetails
}

export const selectShowDetailsForEntityWithIdPersistent = createSelector(
    selectEntityDetailsState,
    (state) => state.showEntityDetails
)

export const selectEntityDetails = createSelector(
    selectEntityDetailsState,
    (state) => state.entityDetails
)

export const selectEntitySearchResults = createSelector(
    selectEntityDetailsState,
    (state) => state.entitySearchResults
)

export const selectEntitySearchResultEntries = createSelector(
    selectEntitySearchResults,
    (results) => results.value
)
