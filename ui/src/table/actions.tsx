import { Rectangle } from '@glideapps/glide-data-grid'
import { ColumnType } from '../column_menu/state'
import { CellValue } from './state'

export type Edit = [string, string, CellValue]

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
    columnData: { [key: string]: CellValue[] }
    constructor(idPersistent: string, columnData: { [key: string]: CellValue[] }) {
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

/**
 *Indicates that the column for which the header menu was open should be deleted.
 */
export class RemoveSelectedColumnAction {}

/**
 * Indicates that the width of a column has changed
 */
export class SetColumnWidthAction {
    columnIdx: number
    width: number
    constructor(columnIdx: number, width: number) {
        this.columnIdx = columnIdx
        this.width = width
    }
}
/**
 * Indicates that a column position has changes
 */
export class ChangeColumnIndexAction {
    startIndex: number
    endIndex: number
    constructor(startIndex: number, endIndex: number) {
        this.startIndex = startIndex
        this.endIndex = endIndex
    }
}

/**
 * Indcates an error during table data fetch.
 */
export class SetLoadDataErrorAction {
    msg: string
    retryCallback?: VoidFunction
    constructor(msg: string, retryCallback?: VoidFunction) {
        this.msg = msg
        this.retryCallback = retryCallback
    }
}

/**
 * Indicates that submitting values has started
 */
export class SubmitValuesStartAction {}

/**
 * Indicates that an error has occured during value submission
 */

export class SubmitValuesErrorAction {
    errorMsg: string
    retryCallback?: VoidFunction

    constructor(errorMsg: string, retryCallback?: VoidFunction) {
        this.errorMsg = errorMsg
        this.retryCallback = retryCallback
    }
}

/**
 * Indicates that values have been edited.
 */
export class SubmitValuesEndAction {
    edits: Edit[]
    constructor(edits: Edit[]) {
        this.edits = edits
    }
}

/**Indicates that the SubmitValuesErrorState should be cleared */
export class SubmitValuesClearErrorAction {}

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
    | ChangeColumnIndexAction
    | SetLoadDataErrorAction
    | SubmitValuesStartAction
    | SubmitValuesErrorAction
    | SubmitValuesEndAction
    | SubmitValuesClearErrorAction
