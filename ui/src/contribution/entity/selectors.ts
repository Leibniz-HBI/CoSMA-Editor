import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'
import { Column, ColumnType } from '../../column_menu/state'
import { GridColumWithType, constructColumnTitle } from './hooks'
import { selectContribution } from '../selectors'
import { newRemote } from '../../util/state'

export const selectContributionEntity = (state: RootState) => state.contributionEntity

/**
 * Check whether there are any duplicates at all
 */
export const selectIsDuplicates = createSelector(selectContributionEntity, (state) => {
    if (state.entities.isLoading) {
        return true
    }
    for (const entity of state.entities.value) {
        if (
            entity.similarEntities.isLoading ||
            entity.similarEntities.value.length > 0
        ) {
            return true
        }
    }
    return false
})

export const selectIsLoading = createSelector(
    selectContributionEntity,
    selectContribution,
    (state, contribution) => contribution.isLoading || state.entities.isLoading
)

export const selectShowColumnsMenu = createSelector(
    selectContributionEntity,
    (state) => state.showColumnMenu
)
export const selectMatchColumnList = createSelector(
    selectContribution,
    (contribution) => contribution.value?.matchColumnList ?? []
)

export const selectColumns = createSelector(
    selectContributionEntity,
    (state): [Column[], { [key: string]: number }] => [
        state.columnList,
        state.columnMap
    ]
)
export const selectEntities = createSelector(
    selectContributionEntity,
    (state) => state.entities
)
export const selectEntitiesWithMatches = createSelector(selectEntities, (state) =>
    newRemote(state.value, state.isLoading, state.errorMsg)
)
export const selectLoadingProgress = createSelector(selectEntities, (entities) => {
    for (let idx = 0; idx < entities.value.length; ++idx) {
        if (entities.value[idx].similarEntities.isLoading) {
            return Math.round((100 * (idx ?? 100)) / entities.value.length)
        }
    }
    return undefined
})

export const selectSelectedEntityIdx = createSelector(
    selectContributionEntity,
    (contributionEntityState) => contributionEntityState.selectedEntityIdx
)

export const selectSelectedEntity = createSelector(
    selectEntities,
    selectSelectedEntityIdx,
    (entities, idx) => {
        if (entities.isLoading || idx === undefined) {
            return undefined
        }
        return entities.value[idx]
    }
)

export const selectLastMatchHit = createSelector(
    selectContributionEntity,
    (state) => state.hitLastMatch
)

export const selectColumnRowDefs = createSelector(
    selectColumns,
    ([columnList, _columnMap]) =>
        columnList.map((column) => {
            return {
                id: column.idPersistent,
                title: constructColumnTitle(column.namePath),
                width: 200,
                columnType: ColumnType.String
            } as GridColumWithType
        })
)

const selectMatchWidths = createSelector(
    selectContributionEntity,
    (state) => state.matchWidths
)

export const selectEntityColumnDefs = createSelector(
    selectSelectedEntity,
    selectMatchWidths,
    (entity, widths) => [
        {
            id: 'Description',
            title: 'Column',
            width: widths[0],
            columnType: ColumnType.String
        },
        {
            id: entity?.idPersistent,
            title: 'Uploaded Entity',
            width: widths[1],
            columnType: ColumnType.String,
            themeOverride: { textDark: '#197374' }
        },
        ...(entity?.similarEntities.value ?? []).map((similar, idx) => {
            return {
                id: similar.idPersistent,
                title: `Match ${idx + 1}`,
                width: widths[idx + 2],
                columnType: ColumnType.String
            } as GridColumWithType
        })
    ]
)

export const selectCompleteEntityAssignment = createSelector(
    selectContributionEntity,
    (state) => state.completeEntityAssignment
)

export const selectShowJustificationInput = createSelector(
    selectContributionEntity,
    (state) => state.showJustificationDialog
)

export const selectJustificationForSelectedEntity = createSelector(
    selectSelectedEntity,
    (entity) => entity?.justificationTxt
)
