import { Rectangle } from '@glideapps/glide-data-grid'
import { ColumnType } from '../column_menu/state'

/**
 * Indicates successful entity fetch.
 */
export class SetEntitiesAction {
    entities: string[]
    constructor(entities: string[]) {
        this.entities = entities
    }
}
/**
 * Indicates successful data fetch
 */
export class AppendColumnAction {
    idPersistent: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columnData: { [key: string]: any }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(idPersistent: string, columnData: { [key: string]: any }) {
        this.idPersistent = idPersistent
        this.columnData = columnData
    }
}

/**
 * Indicates the begin of data fetch for table.
 */
export class SetEntityLoadingAction {}
/**
 * Indicates fetching of column data.
 */
export class SetColumnLoadingAction {
    idPersistent: string
    name: string
    columnType: ColumnType
    constructor(name: string, idPersistent: string, columnType: ColumnType) {
        this.name = name
        this.idPersistent = idPersistent
        this.columnType = columnType
    }
}
/**
 * Indicates that the menu for adding columns should be shown
 */
export class ShowColumnAddMenuAction {}

/**
 * Indicates that the menu for adding columns should be hidden
 */
export class HideColumnAddMenuAction {}

/** Indicates that a column header menu should be displayed */
export class ShowHeaderMenuAction {
    columnIndex: number
    bounds: Rectangle

    constructor(columnIndex: number, bounds: Rectangle) {
        this.columnIndex = columnIndex
        this.bounds = bounds
    }
}

/**
 * Indicates that the column header menu should be closed
 */
export class HideHeaderMenuAction {}

export class SetColumnWidthAction {
    columnIdx: number
    width: number
    constructor(columnIdx: number, width: number) {
        this.columnIdx = columnIdx
        this.width = width
    }
}
export class RemoveSelectedColumnAction {}
/**
 * Indcates an error during table data fetch.
 */
export class SetErrorAction {
    msg: string
    constructor(msg: string) {
        this.msg = msg
    }
}

export type TableAction =
    | SetEntitiesAction
    | AppendColumnAction
    | SetEntityLoadingAction
    | SetColumnLoadingAction
    | ShowColumnAddMenuAction
    | HideColumnAddMenuAction
    | ShowHeaderMenuAction
    | HideHeaderMenuAction
    | RemoveSelectedColumnAction
    | SetColumnWidthAction
    | SetErrorAction
