import {
    ContributionDetailsAction,
    LoadContributionDetailsErrorAction,
    LoadContributionDetailsStartAction,
    LoadContributionDetailsSuccessAction,
    PatchContributionDetailsClearErrorAction,
    PatchContributionDetailsErrorAction,
    PatchContributionDetailsStartAction,
    PatchContributionDetailsSuccessAction
} from './action'
import { ContributionDetailState } from './state'

export function contributionDetailsReducer(
    state: ContributionDetailState,
    action: ContributionDetailsAction
) {
    if (action instanceof LoadContributionDetailsStartAction) {
        return new ContributionDetailState({
            ...state,
            contribution: state.contribution.startLoading()
        })
    }
    if (action instanceof LoadContributionDetailsSuccessAction) {
        return new ContributionDetailState({
            ...state,
            contribution: state.contribution.success(action.contribution)
        })
    }
    if (action instanceof LoadContributionDetailsErrorAction) {
        return new ContributionDetailState({
            ...state,
            contribution: state.contribution.withError(action.msg)
        })
    }
    if (action instanceof PatchContributionDetailsStartAction) {
        return new ContributionDetailState({
            ...state,
            contributionPatch: state.contributionPatch.startLoading()
        })
    }
    if (action instanceof PatchContributionDetailsSuccessAction) {
        return new ContributionDetailState({
            ...state,
            contribution: state.contribution.success(action.contribution),
            contributionPatch: state.contributionPatch.success(undefined)
        })
    }
    if (action instanceof PatchContributionDetailsErrorAction) {
        return new ContributionDetailState({
            ...state,
            contributionPatch: state.contributionPatch.withError(action.msg)
        })
    }
    if (action instanceof PatchContributionDetailsClearErrorAction) {
        return new ContributionDetailState({
            ...state,
            contributionPatch: state.contributionPatch.withoutError()
        })
    }
    return state
}
