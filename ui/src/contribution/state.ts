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
    emptyValues: string
    justification: string | undefined
}
export function newContribution({
    name,
    idPersistent,
    description,
    step,
    hasHeader,
    author,
    emptyValues,
    matchTagDefinitionList = [],
    justification = undefined
}: {
    name: string
    idPersistent: string
    description: string
    step: ContributionStep
    hasHeader: boolean
    author: string
    emptyValues: string
    matchTagDefinitionList?: TagDefinition[]
    justification?: string | undefined
}): Contribution {
    return {
        name,
        idPersistent,
        description,
        step,
        hasHeader,
        author,
        emptyValues,
        matchTagDefinitionList,
        justification
    }
}

export function contributionIsReady(contribution: Contribution): boolean {
    // Could be selector
    return activeSteps.has(contribution.step)
}
