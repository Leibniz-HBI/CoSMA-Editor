import { TagDefinition } from '../column_menu/state'

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
    hasHeader: boolean
    author: string
    matchTagDefinitionList: TagDefinition[]
}
export function newContribution({
    name,
    idPersistent,
    description,
    step,
    hasHeader,
    author,
    matchTagDefinitionList = []
}: {
    name: string
    idPersistent: string
    description: string
    step: ContributionStep
    hasHeader: boolean
    author: string
    matchTagDefinitionList?: TagDefinition[]
}) {
    return {
        name: name,
        idPersistent: idPersistent,
        description: description,
        step: step,
        hasHeader: hasHeader,
        author: author,
        matchTagDefinitionList: matchTagDefinitionList
    }
}

export function contributionIsReady(contribution: Contribution): boolean {
    // Could be selector
    return activeSteps.has(contribution.step)
}
