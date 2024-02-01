import { Contribution } from './state'

/**
 * Indicates that contribution upload was started
 */
export class UploadContributionStartAction {}

/**
 * Indicates that the upload was successful
 */
export class UploadContributionSuccessAction {}

/**
 * Indicates an error during Upload
 */
export class UploadContributionErrorAction {}

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
    | UploadContributionStartAction
    | UploadContributionSuccessAction
    | UploadContributionErrorAction
    | ToggleShowAddContributionAction
    | LoadContributionsStartAction
    | LoadContributionsSuccessAction
    | LoadContributionsErrorAction
