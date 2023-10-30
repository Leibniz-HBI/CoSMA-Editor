import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'
import { ColumnDefinitionsContributionState } from './state'

export const selectColumnDefinitionsContribution = (state: RootState) =>
    state.contributionColumnDefinition

export const selectColumnDefinitionsContributionTriple = createSelector(
    selectColumnDefinitionsContribution,
    (state: ColumnDefinitionsContributionState) => state.columns
)

export const selectSelectedColumnDefinition = createSelector(
    selectColumnDefinitionsContribution,
    (state: ColumnDefinitionsContributionState) => state.selectedColumnDefinition
)

export const selectCreateTabSelected = createSelector(
    selectColumnDefinitionsContribution,
    (state) => state.createTabSelected
)

export const selectFinalizeColumnAssignment = createSelector(
    selectColumnDefinitionsContribution,
    (state) => state.finalizeColumnAssignment
)
