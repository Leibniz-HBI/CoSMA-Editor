export enum ColumnType {
    String,
    Boolean,
    Float,
    Inner
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

export class ColumnSelectionEntry {
    columnDefinition: ColumnDefinition
    isExpanded: boolean
    isLoading: boolean
    children: ColumnSelectionEntry[]

    constructor({
        columnDefinition,
        isExpanded = false,
        isLoading = false,
        children = []
    }: {
        columnDefinition: ColumnDefinition
        isExpanded?: boolean
        isLoading?: boolean
        children?: ColumnSelectionEntry[]
    }) {
        this.columnDefinition = columnDefinition
        this.isExpanded = isExpanded
        this.isLoading = isLoading
        this.children = children
    }
    public isExpandable(): boolean {
        return this.children.length > 0
    }
}

export class ColumnSelectionState {
    navigationEntries: ColumnSelectionEntry[]
    searchEntries: ColumnSelectionEntry[]
    isLoading: boolean
    isSearching: boolean

    constructor({
        navigationEntries: columnSelectionEntries = [],
        searchEntries: searchSelectionEntries = [],
        isLoading = false,
        isSearching = false
    }: {
        navigationEntries?: ColumnSelectionEntry[]
        searchEntries?: ColumnSelectionEntry[]
        isLoading?: boolean
        isSearching?: boolean
    }) {
        this.navigationEntries = columnSelectionEntries
        this.searchEntries = searchSelectionEntries
        this.isLoading = isLoading
        this.isSearching = isSearching
    }
}
