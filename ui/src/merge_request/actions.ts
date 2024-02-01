import { MergeRequest } from './state'

/** Indicate start of loading merge requests */
export class GetMergeRequestsStartAction {}

/**
 * Indicate successful loading of merge requests.
 */
export class GetMergeRequestsSuccessAction {
    created: MergeRequest[]
    assigned: MergeRequest[]

    constructor({
        created,
        assigned
    }: {
        created: MergeRequest[]
        assigned: MergeRequest[]
    }) {
        this.created = created
        this.assigned = assigned
    }
}

/**
 * Indicate an error during loading merge requests
 */
export class GetMergeRequestsErrorAction {}

export type MergeRequestAction =
    | GetMergeRequestsStartAction
    | GetMergeRequestsSuccessAction
    | GetMergeRequestsErrorAction
