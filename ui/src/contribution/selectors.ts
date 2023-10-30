import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

function selectContributionState(state: RootState) {
    return state.contribution
}

export const selectContribution = createSelector(
    selectContributionState,
    (state) => state.selectedContribution
)

export const selectIdContributionPersistent = createSelector(
    selectContribution,
    (contribution) => contribution.value?.idPersistent
)
