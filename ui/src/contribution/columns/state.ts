import { ColumnSelectionEntry, ColumnType } from '../../column_menu/state'
import { Remote } from '../../util/state'
import { Contribution } from '../state'

export class ColumnDefinitionContribution {
    name: string
    idPersistent: string
    idExistingPersistent?: string
    idParentPersistent?: string
    type?: ColumnType
    indexInFile: number
    discard: boolean
    constructor({
        name,
        idPersistent,
        idExistingPersistent = undefined,
        idParentPersistent = undefined,
        type = undefined,
        indexInFile,
        discard
    }: {
        name: string
        idPersistent: string
        idExistingPersistent?: string
        idParentPersistent?: string
        type?: ColumnType
        indexInFile: number
        discard: boolean
    }) {
        this.name = name
        this.idPersistent = idPersistent
        this.idExistingPersistent = idExistingPersistent
        this.idParentPersistent = idParentPersistent
        this.type = type
        this.indexInFile = indexInFile
        this.discard = discard
    }
}

export type ColumnsTriple = {
    activeDefinitionsList: ColumnDefinitionContribution[]
    discardedDefinitionsList: ColumnDefinitionContribution[]
    contributionCandidate: Contribution
}

export class ColumnDefinitionsContributionState {
    columns: Remote<ColumnsTriple | undefined>
    selectedColumnDefinition: Remote<ColumnDefinitionContribution | undefined>
    createTabSelected: boolean

    constructor({
        columns = new Remote(undefined),
        selectedColumnDefinition = new Remote(undefined),
        createTabSelected = false
    }: {
        columns?: Remote<ColumnsTriple | undefined>
        selectedColumnDefinition?: Remote<ColumnDefinitionContribution | undefined>
        createTabSelected?: boolean
        existingColumnSelectionEntries?: Remote<ColumnSelectionEntry[]>
    }) {
        this.columns = columns
        this.selectedColumnDefinition = selectedColumnDefinition
        this.createTabSelected = createTabSelected
    }
}
