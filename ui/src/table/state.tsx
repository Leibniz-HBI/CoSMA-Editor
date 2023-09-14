import { Rectangle } from '@glideapps/glide-data-grid'
import { ColumnDefinition, ColumnType } from '../column_menu/state'
import { ErrorState } from '../util/error/slice'
import { Remote } from '../util/state'

export class TableState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columnStates: ColumnState[]
    columnIndices: Map<string, number>
    entities?: string[]
    entityIndices: Map<string, number>
    isLoading?: boolean
    showColumnAddMenu: boolean
    selectedTagDefinition?: ColumnDefinition
    selectedColumnHeaderBounds?: Rectangle
    frozenColumns: number
    loadDataErrorState?: ErrorState
    isSubmittingValues: boolean
    submitValuesErrorState?: ErrorState
    ownershipChangeTagDefinition?: ColumnDefinition

    constructor({
        columnStates: columnStates = [],
        columnIndices: columnIndices = new Map<string, number>(),
        entities = undefined,
        entityIndices = new Map<string, number>(),
        isLoading = undefined,
        showColumnAddMenu = false,
        selectedTagDefinition = undefined,
        selectedColumnHeaderBounds = undefined,
        frozenColumns = 0,
        loadDataErrorState = undefined,
        isSubmittingValues = false,
        submitValuesErrorState = undefined,
        ownershipChangeTagDefinition = undefined
    }: {
        columnStates?: ColumnState[]
        columnIndices?: Map<string, number>
        entities?: string[]
        entityIndices?: Map<string, number>
        isLoading?: boolean
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rowObjects?: { [key: string]: any }[]
        showColumnAddMenu?: boolean
        selectedTagDefinition?: ColumnDefinition
        selectedColumnHeaderBounds?: Rectangle
        frozenColumns?: number
        loadDataErrorState?: ErrorState
        isSubmittingValues?: boolean
        submitValuesErrorState?: ErrorState
        ownershipChangeTagDefinition?: ColumnDefinition
    }) {
        this.columnIndices = columnIndices
        this.columnStates = columnStates
        this.entities = entities
        this.entityIndices = entityIndices
        this.isLoading = isLoading
        this.showColumnAddMenu = showColumnAddMenu
        this.selectedTagDefinition = selectedTagDefinition
        this.selectedColumnHeaderBounds = selectedColumnHeaderBounds
        this.frozenColumns = frozenColumns
        this.loadDataErrorState = loadDataErrorState
        this.isSubmittingValues = isSubmittingValues
        this.submitValuesErrorState = submitValuesErrorState
        this.ownershipChangeTagDefinition = ownershipChangeTagDefinition
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
        console.log(entities)
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
    tagDefinition: ColumnDefinition
    cellContents: Remote<CellValue[][]>
    width: number

    constructor({
        tagDefinition = {
            idPersistent: '',
            namePath: [],
            columnType: ColumnType.String,
            curated: false,
            version: 0
        },
        cellContents = new Remote([]),
        width = 200
    }: {
        tagDefinition: ColumnDefinition
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
