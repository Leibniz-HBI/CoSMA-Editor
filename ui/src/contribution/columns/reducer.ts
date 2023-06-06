import { findIndexInSorted } from '../../util/sorted'
import { Remote } from '../../util/state'
import {
    ColumnDefinitionsContributionAction,
    ColumnDefinitionContributionSelectAction,
    LoadColumnDefinitionsContributionErrorAction,
    LoadColumnDefinitionsContributionStartAction,
    LoadColumnDefinitionsContributionSuccessAction,
    SetColumnDefinitionFormTabAction,
    PatchColumnDefinitionContributionStartAction,
    PatchColumnDefinitionContributionSuccessAction,
    PatchColumnDefinitionContributionErrorAction
} from './actions'
import {
    ColumnDefinitionContribution,
    ColumnDefinitionsContributionState
} from './state'

export function columnDefinitionContributionReducer(
    state: ColumnDefinitionsContributionState,
    action: ColumnDefinitionsContributionAction
) {
    if (action instanceof SetColumnDefinitionFormTabAction) {
        return new ColumnDefinitionsContributionState({
            ...state,
            createTabSelected: action.createTabSelected
        })
    }
    if (action instanceof ColumnDefinitionContributionSelectAction) {
        return new ColumnDefinitionsContributionState({
            ...state,
            selectedColumnDefinition: new Remote(action.columnDefinition)
        })
    }
    if (action instanceof PatchColumnDefinitionContributionStartAction) {
        return new ColumnDefinitionsContributionState({
            ...state,
            selectedColumnDefinition: state.selectedColumnDefinition.startLoading()
        })
    }
    if (action instanceof PatchColumnDefinitionContributionSuccessAction) {
        if (state.columns.value === undefined) {
            return state
        }
        const activeDefs = state.columns.value.activeDefinitionsList
        const discardedDefs = state.columns.value.discardedDefinitionsList
        const activeIdx = findIndexInSorted(
            activeDefs,
            action.columnDefinition,
            lineIndexSortKey
        )
        let newActiveDefs: ColumnDefinitionContribution[]
        let newDiscardedDefs: ColumnDefinitionContribution[]
        if (
            activeDefs[activeIdx]?.idPersistent == action.columnDefinition.idPersistent
        ) {
            // new column definition was active before
            if (!action.columnDefinition.discard) {
                // new column definition is still active
                newActiveDefs = [
                    ...activeDefs.slice(0, activeIdx),
                    action.columnDefinition,
                    ...activeDefs.slice(activeIdx + 1)
                ]
                newDiscardedDefs = discardedDefs
            } else {
                // new column definition is not active anymore
                newActiveDefs = [
                    ...activeDefs.slice(0, activeIdx),
                    ...activeDefs.slice(activeIdx + 1)
                ]
                const passiveIdx = findIndexInSorted(
                    discardedDefs,
                    action.columnDefinition,
                    lineIndexSortKey
                )
                newDiscardedDefs = [
                    ...discardedDefs.slice(0, passiveIdx),
                    action.columnDefinition,
                    ...discardedDefs.slice(passiveIdx)
                ]
            }
        } else {
            // new column definition was not in active
            const discardIdx = findIndexInSorted(
                discardedDefs,
                action.columnDefinition,
                lineIndexSortKey
            )
            if (
                discardedDefs[discardIdx]?.idPersistent !=
                action.columnDefinition.idPersistent
            ) {
                // neither in active nor discarded. Do nothing
                return state
            }
            if (action.columnDefinition.discard) {
                // new column definition is discarded
                newDiscardedDefs = [
                    ...discardedDefs.slice(0, discardIdx),
                    action.columnDefinition,
                    ...discardedDefs.slice(discardIdx + 1)
                ]
                newActiveDefs = activeDefs
            } else {
                // new column definition is active
                newDiscardedDefs = [
                    ...discardedDefs.slice(0, discardIdx),
                    ...discardedDefs.slice(discardIdx + 1)
                ]
                newActiveDefs = [
                    ...activeDefs.slice(0, activeIdx),
                    action.columnDefinition,
                    ...activeDefs.slice(activeIdx)
                ]
            }
        }

        return new ColumnDefinitionsContributionState({
            ...state,
            columns: new Remote({
                activeDefinitionsList: newActiveDefs,
                discardedDefinitionsList: newDiscardedDefs,
                contributionCandidate: state.columns.value.contributionCandidate
            }),
            selectedColumnDefinition: state.selectedColumnDefinition.success(
                action.columnDefinition
            )
        })
    }
    if (action instanceof LoadColumnDefinitionsContributionStartAction) {
        return new ColumnDefinitionsContributionState({
            columns: state.columns.startLoading(),
            selectedColumnDefinition: new Remote(undefined)
        })
    }
    if (action instanceof LoadColumnDefinitionsContributionSuccessAction) {
        return new ColumnDefinitionsContributionState({
            columns: state.columns.success({
                activeDefinitionsList: action.active,
                discardedDefinitionsList: action.discarded,
                contributionCandidate: action.contribution
            }),
            selectedColumnDefinition: new Remote(
                action.active[0] ?? action.discarded[0] ?? undefined
            ),
            createTabSelected: false
        })
    }
    if (action instanceof LoadColumnDefinitionsContributionErrorAction) {
        return new ColumnDefinitionsContributionState({
            ...state,
            columns: state.columns.withError(action.msg)
        })
    }
    if (action instanceof PatchColumnDefinitionContributionErrorAction) {
        return new ColumnDefinitionsContributionState({
            ...state,
            selectedColumnDefinition: state.selectedColumnDefinition.withError(
                action.msg
            )
        })
    }
    return state
}

export function lineIndexSortKey(columnDefinition: ColumnDefinitionContribution) {
    return columnDefinition.indexInFile
}
