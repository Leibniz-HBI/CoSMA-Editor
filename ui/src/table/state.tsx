import { Rectangle } from '@glideapps/glide-data-grid'
import { ColumnType } from '../column_menu/state'
import { ErrorState } from '../util/error'

export class TableState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columnStates: ColumnState[]
    columnIndices: Map<string, number>
    entities?: string[]
    entityIndices: Map<string, number>
    isLoading?: boolean
    showColumnAddMenu: boolean
    selectedColumnHeaderByIdPersistent?: string
    selectedColumnHeaderBounds?: Rectangle
    frozenColumns: number
    loadDataErrorState?: ErrorState
    isSubmittingValues: boolean
    submitValuesErrorState?: ErrorState

    constructor({
        columnStates: columnStates = [],
        columnIndices: columnIndices = new Map<string, number>(),
        entities = undefined,
        entityIndices = new Map<string, number>(),
        isLoading = undefined,
        showColumnAddMenu = false,
        selectedColumnHeaderByIdPersistent = undefined,
        selectedColumnHeaderBounds = undefined,
        frozenColumns = 0,
        loadDataErrorState = undefined,
        isSubmittingValues = false,
        submitValuesErrorState = undefined
    }: {
        columnStates?: ColumnState[]
        columnIndices?: Map<string, number>
        entities?: string[]
        entityIndices?: Map<string, number>
        isLoading?: boolean
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rowObjects?: { [key: string]: any }[]
        showColumnAddMenu?: boolean
        selectedColumnHeaderByIdPersistent?: string
        selectedColumnHeaderBounds?: Rectangle
        frozenColumns?: number
        loadDataErrorState?: ErrorState
        isSubmittingValues?: boolean
        submitValuesErrorState?: ErrorState
    }) {
        this.columnIndices = columnIndices
        this.columnStates = columnStates
        this.entities = entities
        this.entityIndices = entityIndices
        this.isLoading = isLoading
        this.showColumnAddMenu = showColumnAddMenu
        this.selectedColumnHeaderByIdPersistent = selectedColumnHeaderByIdPersistent
        this.selectedColumnHeaderBounds = selectedColumnHeaderBounds
        this.frozenColumns = frozenColumns
        this.loadDataErrorState = loadDataErrorState
        this.isSubmittingValues = isSubmittingValues
        this.submitValuesErrorState = submitValuesErrorState
    }

    isLoadingColumn(): boolean {
        for (const col of this.columnStates) {
            if (col.isLoading) {
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
                .map((colState) => '"' + colState.name + '"')
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
                            (colState.cellContents[rowIdx][0]?.value?.toString() ??
                                '') +
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
    isLoading: boolean
    cellContents: CellValue[][]
    name: string
    idPersistent: string
    width: number
    columnType: ColumnType

    constructor({
        name,
        isLoading = false,
        cellContents = [],
        idPersistent = '',
        width = 200,
        columnType
    }: {
        name: string
        isLoading?: boolean
        cellContents?: CellValue[][]
        idPersistent: string
        width?: number
        columnType: ColumnType
    }) {
        this.name = name
        this.isLoading = isLoading
        this.cellContents = cellContents
        this.idPersistent = idPersistent
        this.width = width
        this.columnType = columnType
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
                        .map((colState) => '"' + colState.name + '"')
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
                            (colState.cellContents[this.rowIdx][0].value?.toString() ??
                                '') +
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
