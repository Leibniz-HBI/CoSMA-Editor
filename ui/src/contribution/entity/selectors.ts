import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'
import { TagDefinition, TagType } from '../../column_menu/state'
import { GridColumWithType } from './hooks'
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

export const selectShowTagDefinitionsMenu = createSelector(
    selectContributionEntity,
    (state) => state.showTagDefinitionMenu
)

export const selectTagDefinitions = createSelector(
    selectContributionEntity,
    (state): [TagDefinition[], Map<string, number>] => [
        state.tagDefinitions,
        new Map(Object.entries(state.tagDefinitionMap))
    ]
)
export const selectEntities = createSelector(
    selectContributionEntity,
    (state) => state.entities
)
export const selectEntitiesWithMatches = createSelector(selectEntities, (state) =>
    newRemote(
        state.value.filter(
            (entity) =>
                entity.similarEntities.isLoading ||
                entity.similarEntities.value.length > 0
        ),
        state.isLoading,
        state.errorMsg
    )
)
export const selectLoadingProgress = createSelector(selectEntities, (entities) => {
    for (let idx = 0; idx < entities.value.length; ++idx) {
        if (entities.value[idx].similarEntities.isLoading) {
            return Math.round((100 * (idx ?? 100)) / entities.value.length)
        }
    }
    return undefined
})

export const selectColumnDefs = createSelector(
    selectTagDefinitions,
    ([tagDefs, _tagDefMap]) => [
        {
            id: 'Assignment',
            title: 'Assignment',
            width: 200,
            columnType: TagType.Inner
        } as GridColumWithType,
        {
            id: 'display_txt',
            title: 'Display Text',
            width: 200,
            columnType: TagType.String
        } as GridColumWithType,
        {
            id: 'similarity',
            title: 'Similarity',
            width: 100,
            columnType: TagType.String
        } as GridColumWithType,
        ...tagDefs.map((colDef) => {
            return {
                id: colDef.idPersistent,
                title: constructColumnTitle(colDef.namePath),
                width: 200,
                columnType: colDef.columnType
            } as GridColumWithType
        })
    ]
)

export const selectCompleteEntityAssignment = createSelector(
    selectContributionEntity,
    (state) => state.completeEntityAssignment
)

export const selectPageNumber = createSelector(selectContributionEntity, (state) => {
    return state.pageNumber
})
export const selectMaxPageNumber = createSelector(
    selectEntitiesWithMatches,
    (entities) => {
        return Math.ceil((entities.value?.length ?? 0) / 50)
    }
)

export function constructColumnTitle(namePath: string[]): string {
    if (namePath === undefined || namePath.length == 0) {
        return 'UNKNOWN'
    }
    if (namePath.length > 3) {
        return (
            namePath[0] +
            ' -> ... -> ' +
            namePath[namePath.length - 2] +
            ' -> ' +
            namePath[namePath.length - 1]
        )
    }
    return namePath[0] + ' -> ' + namePath.slice(1).join(' -> ')
}
