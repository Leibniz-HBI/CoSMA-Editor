/**
 * Indicates successful data fetch.
 */
export class SetTableAction {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row_objects: any[][]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(row_objects: any[]) {
        this.row_objects = row_objects
    }
}

/**
 * Indicates the begin of data fetch for table.
 */
export class SetLoadingAction {}

/**
 * Indcates an error during table data fetch.
 */
export class SetErrorAction {
    msg: string
    constructor(msg: string) {
        this.msg = msg
    }
}

export type TableAction = SetTableAction | SetLoadingAction | SetErrorAction
