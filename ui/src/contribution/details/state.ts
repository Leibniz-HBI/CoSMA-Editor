import { Remote } from '../../util/state'
import { Contribution } from '../state'

export class ContributionDetailState {
    contribution: Remote<Contribution | undefined>
    contributionPatch: Remote<undefined>

    constructor({
        contribution = new Remote(undefined),
        contributionPatch = new Remote(undefined)
    }: {
        contribution?: Remote<Contribution | undefined>
        contributionPatch?: Remote<undefined>
    }) {
        this.contribution = contribution
        this.contributionPatch = contributionPatch
    }
}
