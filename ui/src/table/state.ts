import { Rectangle } from '@glideapps/glide-data-grid'
import { TagDefinition, TagType } from '../column_menu/state'
import { ErrorState } from '../util/error/slice'
import { Remote } from '../util/state'

export class TableState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columnStates: ColumnState[]
    columnIndices: Map<string, number>
    entities?: Entity[]
    entityIndices: Map<string, number>
    isLoading?: boolean
    showColumnAddMenu: boolean
    selectedTagDefinition?: TagDefinition
    selectedColumnHeaderBounds?: Rectangle
    frozenColumns: number
    loadDataErrorState?: ErrorState
    isSubmittingValues: boolean
    submitValuesErrorState?: ErrorState
    ownershipChangeTagDefinition?: TagDefinition
    showEntityAddDialog: boolean
    entityAddState: Remote<boolean>
    showEntityMergingModal: boolean

    constructor({
        columnStates: columnStates = [],
        columnIndices: columnIndices = new Map<string, number>(),
        entities = undefined,
        entityIndices = undefined,
        isLoading = undefined,
        showColumnAddMenu = false,
        selectedTagDefinition = undefined,
        selectedColumnHeaderBounds = undefined,
        frozenColumns = 0,
        loadDataErrorState = undefined,
        isSubmittingValues = false,
        submitValuesErrorState = undefined,
        ownershipChangeTagDefinition = undefined,
        showEntityAddDialog = false,
        entityAddState = new Remote(false),
        showEntityMergingModal = false
    }: {
        columnStates?: ColumnState[]
        columnIndices?: Map<string, number>
        entities?: Entity[]
        entityIndices?: Map<string, number>
        isLoading?: boolean
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rowObjects?: { [key: string]: any }[]
        showColumnAddMenu?: boolean
        selectedTagDefinition?: TagDefinition
        selectedColumnHeaderBounds?: Rectangle
        frozenColumns?: number
        loadDataErrorState?: ErrorState
        isSubmittingValues?: boolean
        submitValuesErrorState?: ErrorState
        ownershipChangeTagDefinition?: TagDefinition
        showEntityAddDialog?: boolean
        entityAddState?: Remote<boolean>
        showEntityMergingModal?: boolean
    }) {
        this.columnIndices = columnIndices
        this.columnStates = columnStates
        this.entities = entities
        if (entities === undefined) {
            this.entityIndices = new Map([])
        } else {
            if (entityIndices === undefined || entityIndices.size != entities.length) {
                this.entityIndices = new Map(
                    entities.map((entity, idx) => [entity.idPersistent, idx])
                )
            } else {
                this.entityIndices = entityIndices
            }
        }
        this.isLoading = isLoading
        this.showColumnAddMenu = showColumnAddMenu
        this.selectedTagDefinition = selectedTagDefinition
        this.selectedColumnHeaderBounds = selectedColumnHeaderBounds
        this.frozenColumns = frozenColumns
        this.loadDataErrorState = loadDataErrorState
        this.isSubmittingValues = isSubmittingValues
        this.submitValuesErrorState = submitValuesErrorState
        this.ownershipChangeTagDefinition = ownershipChangeTagDefinition
        this.showEntityAddDialog = showEntityAddDialog
        this.entityAddState = entityAddState
        this.showEntityMergingModal = showEntityMergingModal
    }

    isLoadingColumn(): boolean {
        for (const col of this.columnStates) {
            if (col.cellContents.isLoading) {
                return true
            }
        }
        return false
    }
    csvLines(): string[] {
        const entities = this.entities
        if (entities === undefined || entities.length == 0) {
            return []
        }
        const lines = []
        const header =
            '"id_entity_persistent","display_txt",' +
            this.columnStates
                .slice(1)
                .map((colState) => '"' + colState.name() + '"')
                .join(',')
        if (header.endsWith(',')) {
            lines.push(header.slice(0, header.length - 1) + '\n')
        } else {
            lines.push(header + '\n')
        }

        for (let rowIdx = 0; rowIdx < entities.length; ++rowIdx) {
            const value =
                '"' +
                entities[rowIdx] +
                '",' +
                this.columnStates
                    .map(
                        (colState) =>
                            '"' +
                            (colState.cellContents.value[
                                rowIdx
                            ][0]?.value?.toString() ?? '') +
                            '"'
                    )
                    .join(',') +
                '\n'
            lines.push(value)
        }
        return lines
    }
}

export type CellValue = {
    isExisting?: boolean
    isRequested?: boolean
    value: boolean | string | number | undefined
    idPersistent: string
    version: number
}

export class ColumnState {
    tagDefinition: TagDefinition
    cellContents: Remote<CellValue[][]>
    width: number

    constructor({
        tagDefinition = {
            idPersistent: '',
            namePath: [],
            columnType: TagType.String,
            curated: false,
            version: 0,
            hidden: false
        },
        cellContents = new Remote([]),
        width = 200
    }: {
        tagDefinition: TagDefinition
        cellContents?: Remote<CellValue[][]>
        width?: number
    }) {
        this.tagDefinition = tagDefinition
        this.cellContents = cellContents
        this.width = width
    }

    name(): string {
        return this.tagDefinition.namePath[this.tagDefinition.namePath.length - 1]
    }
}

export class TableStateCsvIterator implements Iterator<string | undefined> {
    tableState: TableState
    rowIdx: number

    constructor(tableState: TableState) {
        this.tableState = tableState
        this.rowIdx = -1
    }

    next(): IteratorResult<string | undefined> {
        const entities = this.tableState.entities
        if (entities === undefined || this.rowIdx > entities.length)
            return { done: true, value: undefined }
        if (this.rowIdx < 0) {
            this.rowIdx += 1
            return {
                done: entities.length == 0,
                value:
                    '"id_entity_persistent","display_txt",' +
                    this.tableState.columnStates
                        .map((colState) => '"' + colState.name() + '"')
                        .join(',') +
                    '\n'
            }
        } else {
            const value =
                '"' +
                entities[this.rowIdx] +
                '",' +
                this.tableState.columnStates
                    .map(
                        (colState) =>
                            '"' +
                            (colState.cellContents.value[
                                this.rowIdx
                            ][0].value?.toString() ?? '') +
                            '"'
                    )
                    .join(',') +
                '\n'
            this.rowIdx += 1
            return {
                done: this.rowIdx >= entities.length,
                value
            }
        }
    }
}
export interface Entity {
    idPersistent: string
    displayTxt: string
    version: number
    disabled: boolean
    displayTxtDetails: string | TagDefinition
}

export function newEntity({
    idPersistent,
    displayTxt,
    displayTxtDetails,
    version,
    disabled
}: {
    idPersistent: string
    displayTxt: string
    displayTxtDetails: string | TagDefinition
    version: number
    disabled: boolean
}) {
    return {
        idPersistent: idPersistent,
        displayTxt: displayTxt,
        displayTxtDetails: displayTxtDetails,
        version: version,
        disabled: disabled
    }
}
