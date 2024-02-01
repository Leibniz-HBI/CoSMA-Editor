export enum TagType {
    String,
    Float,
    Inner
}

export interface TagDefinition {
    namePath: string[]
    idPersistent: string
    idParentPersistent?: string
    columnType: TagType
    curated: boolean
    version: number
    owner?: string
    hidden: boolean
}

export function newTagDefinition({
    namePath,
    idPersistent,
    idParentPersistent = undefined,
    columnType,
    curated,
    owner = 'Unknown User',
    version,
    hidden
}: {
    namePath: string[]
    idPersistent: string
    idParentPersistent?: string
    columnType: TagType
    curated: boolean
    owner?: string
    version: number
    hidden: boolean
}) {
    return {
        namePath,
        idPersistent,
        idParentPersistent,
        columnType,
        curated,
        owner,
        version,
        hidden
    }
}

export interface TagSelectionEntry {
    columnDefinition: TagDefinition
    isExpanded: boolean
    isLoading: boolean
    children: TagSelectionEntry[]
}
export function newTagSelectionEntry({
    columnDefinition,
    isExpanded = false,
    isLoading = false,
    children = []
}: {
    columnDefinition: TagDefinition
    isExpanded?: boolean
    isLoading?: boolean
    children?: TagSelectionEntry[]
}) {
    return {
        columnDefinition: columnDefinition,
        isExpanded: isExpanded,
        isLoading: isLoading,
        children: children
    }
}

export interface TagSelectionState {
    navigationEntries: TagSelectionEntry[]
    searchEntries: TagSelectionEntry[]
    isLoading: boolean
    isSearching: boolean
    isSubmittingDefinition: boolean
}
export function newTagSelectionState({
    navigationEntries: columnSelectionEntries = [],
    searchEntries: searchSelectionEntries = [],
    isLoading = false,
    isSearching = false,
    isSubmittingDefinition = false
}: {
    navigationEntries?: TagSelectionEntry[]
    searchEntries?: TagSelectionEntry[]
    isLoading?: boolean
    isSearching?: boolean
    isSubmittingDefinition?: boolean
}): TagSelectionState {
    return {
        navigationEntries: columnSelectionEntries,
        searchEntries: searchSelectionEntries,
        isLoading: isLoading,
        isSearching: isSearching,
        isSubmittingDefinition: isSubmittingDefinition
    }
}
