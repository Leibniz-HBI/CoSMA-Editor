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
export class UploadContributionErrorAction {
    msg: string

    constructor(msg: string) {
        this.msg = msg
    }
}

/**
 * indicates that the uplaod form should be shown or hidden.
 */
export class ToggleShowAddContributionAction {}
/**
 * Indicates that the upload error state should be cleared
 */
export class UploadContributionClearErrorAction {}

/**
 * Indicates that loading of contribution has started
 */
export class LoadContributionStartAction {}

/**
 * Indicates that contributions where successfully loaded
 */
export class LoadContributionSuccessAction {
    contributions: Contribution[]

    constructor(contributions: Contribution[]) {
        this.contributions = contributions
    }
}

/**
 * Indicates that there was an error during loading of contributions.
 */
export class LoadContributionErrorAction {
    msg: string

    constructor(msg: string) {
        this.msg = msg
    }
}

export type ContributionAction =
    | UploadContributionStartAction
    | UploadContributionSuccessAction
    | UploadContributionErrorAction
    | ToggleShowAddContributionAction
    | UploadContributionClearErrorAction
    | LoadContributionStartAction
    | LoadContributionSuccessAction
    | LoadContributionErrorAction
