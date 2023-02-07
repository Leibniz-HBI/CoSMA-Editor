import { ColumnType } from './state'

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
    | SetErrorAction
