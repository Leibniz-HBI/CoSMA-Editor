import { PublicUserInfo } from '../user/state'
import { RemoteInterface, newRemote } from '../util/state'

export enum TagType {
    String = 'STRING',
    Float = 'FLOAT',
    Inner = 'INNER'
}

export interface TagDefinition {
    namePath: string[]
    idPersistent: string
    idParentPersistent?: string
    columnType: TagType
    curated: boolean
    version: number
    owner?: PublicUserInfo
    description?: string
    hidden: boolean
    disabled: boolean
}

export function newTagDefinition({
    namePath,
    idPersistent,
    idParentPersistent = undefined,
    columnType,
    curated,
    owner,
    version,
    description = undefined,
    hidden,
    disabled = false
}: {
    namePath: string[]
    idPersistent: string
    idParentPersistent?: string
    columnType: TagType
    curated: boolean
    owner?: PublicUserInfo
    version: number
    description?: string
    hidden: boolean
    disabled?: boolean
}): TagDefinition {
    return {
        namePath,
        idPersistent,
        idParentPersistent,
        columnType,
        curated,
        owner,
        version,
        description,
        hidden,
        disabled
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
    editTagDefinition: RemoteInterface<TagDefinition | undefined>
    isDragging: boolean
}
export function newTagSelectionState({
    navigationEntries: columnSelectionEntries = [],
    searchEntries: searchSelectionEntries = [],
    isLoading = false,
    isSearching = false,
    isSubmittingDefinition = false,
    editTagDefinition = newRemote(undefined),
    isDragging = false
}: {
    navigationEntries?: TagSelectionEntry[]
    searchEntries?: TagSelectionEntry[]
    isLoading?: boolean
    isSearching?: boolean
    isSubmittingDefinition?: boolean
    editTagDefinition?: RemoteInterface<TagDefinition | undefined>
    draggedSelectionEntry?: TagSelectionEntry
    isDragging?: boolean
}): TagSelectionState {
    return {
        navigationEntries: columnSelectionEntries,
        searchEntries: searchSelectionEntries,
        isLoading: isLoading,
        isSearching: isSearching,
        isSubmittingDefinition: isSubmittingDefinition,
        editTagDefinition,
        isDragging
    }
}
