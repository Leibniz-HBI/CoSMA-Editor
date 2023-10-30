import { ErrorState } from '../util/error/slice'

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
}

export function newTagDefinition({
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
    columnType: TagType
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
    errorState?: ErrorState
    isSubmittingDefinition: boolean
    submissionErrorState?: ErrorState
}
export function newTagSelectionState({
    navigationEntries: columnSelectionEntries = [],
    searchEntries: searchSelectionEntries = [],
    isLoading = false,
    isSearching = false,
    errorState = undefined,
    isSubmittingDefinition = false,
    submissionErrorState = undefined
}: {
    navigationEntries?: TagSelectionEntry[]
    searchEntries?: TagSelectionEntry[]
    isLoading?: boolean
    isSearching?: boolean
    errorState?: ErrorState
    isSubmittingDefinition?: boolean
    submissionErrorState?: ErrorState
}): TagSelectionState {
    return {
        navigationEntries: columnSelectionEntries,
        searchEntries: searchSelectionEntries,
        isLoading: isLoading,
        isSearching: isSearching,
        errorState: errorState,
        isSubmittingDefinition: isSubmittingDefinition,
        submissionErrorState: submissionErrorState
    }
}
