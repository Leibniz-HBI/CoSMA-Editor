export enum ColumnType {
    String,
    Boolean,
    Float
}

export class ColumnDefinition {
    namePath: string[]
    idPersistent: string
    idParentPersistent?: string
    columnType: ColumnType
    version: number

    constructor({
        namePath,
        idPersistent,
        idParentPersistent,
        columnType,
        version
    }: {
        namePath: string[]
        idPersistent: string
        idParentPersistent?: string
        columnType: ColumnType
        version: number
    }) {
        this.namePath = namePath
        this.idPersistent = idPersistent
        this.idParentPersistent = idParentPersistent
        this.columnType = columnType
        this.version = version
    }
}
