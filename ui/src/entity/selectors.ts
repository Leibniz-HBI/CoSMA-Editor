import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { mkUpUntilDateColumnId } from '../util/misc'

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

export const selectEntityByIdPersistentMap = createSelector(
    selectEntityDetailsState,
    (state) => state.entityByIdPersistentMap
)

export const makeSelectAuxiliaryEntityByIdPersistent = () => {
    const selector = createSelector(
        [
            selectEntityByIdPersistentMap,
            (_state, idPersistent: string, upUntilTime: Date | undefined) => mkUpUntilDateColumnId(
                idPersistent,
                upUntilTime
            )
        ],
        (state, upUntilKey) => state[upUntilKey]
    )
    return selector
}
