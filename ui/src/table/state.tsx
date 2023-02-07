export class TableState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columnStates: ColumnState[]
    columnIndices: { [key: string]: number }
    entities: string[]
    isLoading?: boolean
    errorMsg?: string

    constructor({
        columnStates: columnStates = [],
        columnIndices: columnIndices = {},
        entities = [],
        isLoading = undefined,
        errorMsg = undefined
    }: {
        columnStates?: ColumnState[]
        columnIndices?: { [key: string]: number }
        entities?: string[]
        isLoading?: boolean
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rowObjects?: { [key: string]: any }[]
        errorMsg?: string
    }) {
        this.columnIndices = columnIndices
        this.columnStates = columnStates
        this.entities = entities
        this.isLoading = isLoading
        this.errorMsg = errorMsg
    }

    isLoadingColumn(): boolean {
        for (const col of this.columnStates) {
            if (col.isLoading) {
                return true
            }
        }
        return false
    }
}

export enum ColumnType {
    String,
    Boolean,
    Float
}

export class ColumnState {
    isLoading: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cellContents: { [key: string]: any }
    name: string
    idPersistent: string
    width: number
    columnType: ColumnType

    constructor({
        name,
        isLoading = false,
        cellContents = {},
        idPersistent = '',
        width = 200,
        columnType
    }: {
        name: string
        isLoading?: boolean
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cellContents?: { [key: string]: any }
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
