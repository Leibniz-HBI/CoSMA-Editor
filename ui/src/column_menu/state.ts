import { ErrorState } from '../util/error/slice'

export enum ColumnType {
    String,
    Float,
    Inner
}

export interface ColumnDefinition {
    namePath: string[]
    idPersistent: string
    idParentPersistent?: string
    columnType: ColumnType
    curated: boolean
    version: number
    owner?: string
}

export function newColumnDefinition({
    namePath,
    idPersistent,
    idParentPersistent,
    columnType,
    curated,
    owner = 'Unknown User',
    version
}: {
    namePath: string[]
    idPersistent: string
    idParentPersistent?: string
    columnType: ColumnType
    curated: boolean
    owner?: string
    version: number
}) {
    return {
        namePath,
        idPersistent,
        idParentPersistent,
        columnType,
        curated,
        owner,
        version
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
    errorState?: ErrorState
    isSubmittingDefinition: boolean
    submissionErrorState?: ErrorState

    constructor({
        navigationEntries: columnSelectionEntries = [],
        searchEntries: searchSelectionEntries = [],
        isLoading = false,
        isSearching = false,
        errorState = undefined,
        isSubmittingDefinition = false,
        submissionErrorState = undefined
    }: {
        navigationEntries?: ColumnSelectionEntry[]
        searchEntries?: ColumnSelectionEntry[]
        isLoading?: boolean
        isSearching?: boolean
        errorState?: ErrorState
        isSubmittingDefinition?: boolean
        submissionErrorState?: ErrorState
    }) {
        this.navigationEntries = columnSelectionEntries
        this.searchEntries = searchSelectionEntries
        this.isLoading = isLoading
        this.isSearching = isSearching
        this.errorState = errorState
        this.isSubmittingDefinition = isSubmittingDefinition
        this.submissionErrorState = submissionErrorState
    }
}
