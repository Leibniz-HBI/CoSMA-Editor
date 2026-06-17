import { Column } from '../column_menu/state'

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
    matchColumnList: Column[]
    emptyValues: string
    justification: string | undefined
    markedForDeletion: boolean
}
export function newContribution({
    name,
    idPersistent,
    description,
    step,
    hasHeader,
    author,
    emptyValues,
    matchColumnList = [],
    justification = undefined,
    markedForDeletion = false
}: {
    name: string
    idPersistent: string
    description: string
    step: ContributionStep
    hasHeader: boolean
    author: string
    emptyValues: string
    matchColumnList?: Column[]
    justification?: string | undefined
    markedForDeletion?: boolean
}): Contribution {
    return {
        name,
        idPersistent,
        description,
        step,
        hasHeader,
        author,
        emptyValues,
        matchColumnList: matchColumnList,
        justification,
        markedForDeletion: markedForDeletion
    }
}

export function contributionIsReady(contribution: Contribution): boolean {
    // Could be selector
    return activeSteps.has(contribution.step)
}
