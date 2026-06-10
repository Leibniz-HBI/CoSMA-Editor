import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'
import {
    ColumnDefinitionContribution,
    ColumnDefinitionsContributionState,
    ColumnsTuple
} from './state'
import { newRemote, RemoteInterface } from '../../util/state'

export const selectColumnDefinitionsContribution = (state: RootState) =>
    state.contributionColumnDefinition

export const selectColumnDefinitionsContributionTriple = createSelector(
    selectColumnDefinitionsContribution,
    (state: ColumnDefinitionsContributionState) => state.columns
)

function selectColumnContributionDefinitionByIdPersistent(
    idPersistent: string | undefined,
    columns: ColumnDefinitionContribution[] | undefined
) {
    return columns?.find((def) => def.idPersistent === idPersistent)
}

export const selectContributionColumnDefinitionById = createSelector(
    selectColumnDefinitionsContributionTriple,
    (state: RemoteInterface<ColumnsTuple|undefined>) =>
        (idColumnContributionPersistent: string | undefined) => {
            if (state.isLoading) {
                return newRemote(undefined, true)
            }
            return newRemote(
                selectColumnContributionDefinitionByIdPersistent(
                    idColumnContributionPersistent,
                    state.value?.activeDefinitionsList
                ) ??
                    selectColumnContributionDefinitionByIdPersistent(
                        idColumnContributionPersistent,
                        state.value?.discardedDefinitionsList
                    )
            )
        }
)

export const selectCreateTabSelected = createSelector(
    selectColumnDefinitionsContribution,
    (state) => state.createTabSelected
)

export const selectFinalizeColumnAssignment = createSelector(
    selectColumnDefinitionsContribution,
    (state) => state.finalizeColumnAssignment
)

export const selectPreview = createSelector(
    selectColumnDefinitionsContribution,
    (state) => state.preview
)
