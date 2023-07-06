import { Remote } from '../util/state'

export enum ContributionStep {
    Uploaded = 'Uploaded',
    ColumnsExtracted = 'Columns extracted',
    ColumnsAssigned = 'Columns assigned',
    ValuesExtracted = 'Values extracted',
    EntitiesMatched = 'Entities matched',
    EntitiesAssigned = 'Entities assigned',
    ValuesAssigned = 'Values assigned',
    Merged = 'Merged'
}

const activeSteps = new Set([
    ContributionStep.ColumnsExtracted,
    ContributionStep.EntitiesMatched,
    ContributionStep.EntitiesMatched,
    ContributionStep.ValuesAssigned
])

export class Contribution {
    name: string
    idPersistent: string
    description: string
    step: ContributionStep
    anonymous: boolean
    hasHeader: boolean
    author?: string

    constructor({
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
        this.name = name
        this.idPersistent = idPersistent
        this.description = description
        this.step = step
        this.anonymous = anonymous
        this.hasHeader = hasHeader
        this.author = author
    }
    getAuthor(): string {
        return this.anonymous ? 'Anonymous' : this.author ?? 'Anonymous'
    }

    isReady(): boolean {
        return this.step in activeSteps
    }
}

export class ContributionState {
    contributions: Remote<Contribution[]>
    showAddContribution: Remote<boolean>

    constructor({
        contributions = new Remote([]),
        showAddContribution = new Remote(false)
    }: {
        contributions?: Remote<Contribution[]>
        showAddContribution?: Remote<boolean>
    }) {
        this.contributions = contributions
        this.showAddContribution = showAddContribution
    }
}
