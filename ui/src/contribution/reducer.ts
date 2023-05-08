import { Remote } from '../util/state'
import {
    UploadContributionClearErrorAction,
    ContributionAction,
    LoadContributionErrorAction,
    LoadContributionStartAction,
    LoadContributionSuccessAction,
    ToggleShowAddContributionAction,
    UploadContributionErrorAction,
    UploadContributionStartAction,
    UploadContributionSuccessAction
} from './actions'
import { ContributionState } from './state'

export function contributionReducer(
    state: ContributionState,
    action: ContributionAction
) {
    if (action instanceof LoadContributionStartAction) {
        return new ContributionState({
            ...state,
            contributions: state.contributions.startLoading()
        })
    }
    if (action instanceof LoadContributionSuccessAction) {
        return new ContributionState({
            ...state,
            contributions: state.contributions.success(action.contributions)
        })
    }
    if (action instanceof LoadContributionErrorAction) {
        return new ContributionState({
            ...state,
            contributions: state.contributions.withError(action.msg)
        })
    }
    if (action instanceof UploadContributionStartAction) {
        return new ContributionState({
            ...state,
            showAddContribution: state.showAddContribution.startLoading()
        })
    }
    if (action instanceof UploadContributionSuccessAction) {
        return new ContributionState({
            ...state,
            showAddContribution: state.showAddContribution.success(false)
        })
    }
    if (action instanceof UploadContributionErrorAction) {
        return new ContributionState({
            ...state,
            showAddContribution: state.showAddContribution.withError(action.msg)
        })
    }
    if (action instanceof ToggleShowAddContributionAction) {
        return new ContributionState({
            ...state,
            showAddContribution: new Remote(!state.showAddContribution.value)
        })
    }
    if (action instanceof UploadContributionClearErrorAction) {
        return new ContributionState({
            ...state,
            showAddContribution: state.showAddContribution.withoutError()
        })
    }
    return state
}
