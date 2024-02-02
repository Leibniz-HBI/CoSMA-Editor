import { Contribution } from './state'

/**
 * indicates that the uplaod form should be shown or hidden.
 */
export class ToggleShowAddContributionAction {}

/**
 * Indicates that loading of contribution has started
 */
export class LoadContributionsStartAction {}

/**
 * Indicates that contributions where successfully loaded
 */
export class LoadContributionsSuccessAction {
    contributions: Contribution[]

    constructor(contributions: Contribution[]) {
        this.contributions = contributions
    }
}

/**
 * Indicates that there was an error during loading of contributions.
 */
export class LoadContributionsErrorAction {}

export type ContributionAction =
    | ToggleShowAddContributionAction
    | LoadContributionsStartAction
    | LoadContributionsSuccessAction
    | LoadContributionsErrorAction
