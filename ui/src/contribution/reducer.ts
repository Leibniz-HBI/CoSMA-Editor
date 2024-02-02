import { Remote } from '../util/state'
import {
    ContributionAction,
    LoadContributionsErrorAction,
    LoadContributionsStartAction,
    LoadContributionsSuccessAction,
    ToggleShowAddContributionAction
} from './actions'
import { ContributionState, newContributionState } from './state'

export function contributionReducer(
    state: ContributionState,
    action: ContributionAction
) {
    if (action instanceof LoadContributionsStartAction) {
        return newContributionState({
            ...state,
            contributions: state.contributions.startLoading()
        })
    }
    if (action instanceof LoadContributionsSuccessAction) {
        return newContributionState({
            ...state,
            contributions: state.contributions.success(action.contributions)
        })
    }
    if (action instanceof LoadContributionsErrorAction) {
        return newContributionState({
            ...state,
            contributions: state.contributions.success(state.contributions.value)
        })
    }
    if (action instanceof ToggleShowAddContributionAction) {
        return newContributionState({
            ...state,
            showAddContribution: new Remote(!state.showAddContribution.value)
        })
    }
    return state
}
