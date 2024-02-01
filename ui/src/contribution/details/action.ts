import { Contribution } from '../state'

/**
 * Indicates start of loading a contribution
 */
export class LoadContributionDetailsStartAction {}

/**
 * Indicates a successful loading of a contribution
 */
export class LoadContributionDetailsSuccessAction {
    contribution: Contribution

    constructor(contribution: Contribution) {
        this.contribution = contribution
    }
}

/**
 * Indicates error during loading of contribution
 */
export class LoadContributionDetailsErrorAction {}

/**
 * Indicates start of contribution patch
 */
export class PatchContributionDetailsStartAction {}

/**
 * Indicates a successful contribution patch
 */
export class PatchContributionDetailsSuccessAction {
    contribution: Contribution

    constructor(contribution: Contribution) {
        this.contribution = contribution
    }
}

/**
 * Indicates an error during contribution patch
 */
export class PatchContributionDetailsErrorAction {}

/**
 * Indicate that the error of patching contributions should be cleared
 */
export class PatchContributionDetailsClearErrorAction {}

export type LoadContributionDetailsAction =
    | LoadContributionDetailsStartAction
    | LoadContributionDetailsSuccessAction
    | LoadContributionDetailsErrorAction

export type ContributionDetailsAction =
    | LoadContributionDetailsAction
    | PatchContributionDetailsStartAction
    | PatchContributionDetailsSuccessAction
    | PatchContributionDetailsErrorAction
    | PatchContributionDetailsClearErrorAction
