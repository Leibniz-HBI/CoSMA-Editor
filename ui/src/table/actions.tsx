
/**
 * Indicates successful data fetch.
 */
export class SetTableAction {
    row_objects: any[][]
    constructor(row_objects: any[]) {
        this.row_objects = row_objects
    }
}

/**
 * Indicates the begin of data fetch for table.
 */
export class SetLoadingAction { }

/**
 * Indcates an error during table data fetch.
 */
export class SetErrorAction {
    msg: string;
    constructor(msg: string) {
        this.msg = msg
    }
}

export type TableAction = SetTableAction | SetLoadingAction | SetErrorAction
