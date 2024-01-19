import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../../store'
import { TagDefinition, TagType } from '../../column_menu/state'
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

export const selectShowTagDefinitionsMenu = createSelector(
    selectContributionEntity,
    (state) => state.showTagDefinitionMenu
)
export const selectMatchTagDefinitionList = createSelector(
    selectContribution,
    (contribution) => contribution.value?.matchTagDefinitionList ?? []
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

export const selectTagRowDefs = createSelector(
    selectTagDefinitions,
    ([tagDefList, _tagDefMap]) =>
        tagDefList.map((tagDef) => {
            return {
                id: tagDef.idPersistent,
                title: constructColumnTitle(tagDef.namePath),
                width: 200,
                columnType: TagType.String
            } as GridColumWithType
        })
)

export const selectEntityColumnDefs = createSelector(selectSelectedEntity, (entity) => [
    {
        id: 'Description',
        title: 'Tag Name',
        width: 200,
        columnType: TagType.String
    },
    {
        id: entity?.idPersistent,
        title: 'Uploaded Entity',
        width: 200,
        columnType: TagType.String,
        themeOverride: { textDark: '#197374' }
    },
    ...(entity?.similarEntities.value ?? []).map((similar, idx) => {
        return {
            id: similar.idPersistent,
            title: `Match ${idx + 1}`,
            width: 200,
            columnType: TagType.String
        } as GridColumWithType
    })
])

export const selectCompleteEntityAssignment = createSelector(
    selectContributionEntity,
    (state) => state.completeEntityAssignment
)
