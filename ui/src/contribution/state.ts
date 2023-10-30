import { Remote } from '../util/state'

export enum ContributionStep {
    Uploaded = 'Uploaded',
    ColumnsExtracted = 'Columns extracted',
    ColumnsAssigned = 'Columns assigned',
    ValuesExtracted = 'Values extracted',
    EntitiesMatched = 'Entities matched',
    EntitiesAssigned = 'Entities assigned',
    ValuesAssigned = 'Values assigned',
    Merged = 'Complete'
}

const activeSteps = new Set([
    ContributionStep.ColumnsExtracted,
    ContributionStep.EntitiesMatched,
    ContributionStep.ValuesExtracted
])

export interface Contribution {
    name: string
    idPersistent: string
    description: string
    step: ContributionStep
    anonymous: boolean
    hasHeader: boolean
    author?: string
}
export function newContribution({
    name,
    idPersistent,
    description,
    step,
    anonymous,
    hasHeader,
    author = undefined
}: {
    name: string
    idPersistent: string
    description: string
    step: ContributionStep
    anonymous: boolean
    hasHeader: boolean
    author?: string
}) {
    return {
        name: name,
        idPersistent: idPersistent,
        description: description,
        step: step,
        anonymous: anonymous,
        hasHeader: hasHeader,
        author: author
    }
}

export function contributionGetAuthor(contribution: Contribution): string {
    // Could be selector
    return contribution.anonymous ? 'Anonymous' : contribution.author ?? 'Anonymous'
}

export function contributionIsReady(contribution: Contribution): boolean {
    // Could be selector
    return activeSteps.has(contribution.step)
}

export interface ContributionState {
    contributions: Remote<Contribution[]>
    showAddContribution: Remote<boolean>
}
export function newContributionState({
    contributions = new Remote([]),
    showAddContribution = new Remote(false)
}: {
    contributions?: Remote<Contribution[]>
    showAddContribution?: Remote<boolean>
}) {
    return {
        contributions: contributions,
        showAddContribution: showAddContribution
    }
}
