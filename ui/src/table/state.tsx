import { Rectangle } from '@glideapps/glide-data-grid'
import { ColumnType } from '../column_menu/state'
import { ErrorState } from '../util/error'

export class TableState {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columnStates: ColumnState[]
    columnIndices: Map<string, number>
    entities: string[]
    entityIndices: Map<string, number>
    isLoading?: boolean
    showColumnAddMenu: boolean
    selectedColumnHeaderByIdPersistent?: string
    selectedColumnHeaderBounds?: Rectangle
    frozenColumns: number
    loadDataErrorState?: ErrorState

    constructor({
        columnStates: columnStates = [],
        columnIndices: columnIndices = new Map<string, number>(),
        entities = [],
        entityIndices = new Map<string, number>(),
        isLoading = undefined,
        showColumnAddMenu = false,
        selectedColumnHeaderByIdPersistent = undefined,
        selectedColumnHeaderBounds = undefined,
        frozenColumns = 0,
        loadDataErrorState = undefined
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
