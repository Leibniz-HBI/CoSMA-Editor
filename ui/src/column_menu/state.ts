import { PublicUserInfo, newPublicUserInfo } from '../user/state'
import { RemoteInterface, newRemote } from '../util/state'

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
    owner?: PublicUserInfo
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
}
export function newTagSelectionState({
    navigationEntries: columnSelectionEntries = [],
    searchEntries: searchSelectionEntries = [],
    isLoading = false,
    isSearching = false,
    isSubmittingDefinition = false,
    editTagDefinition = newRemote(undefined)
}: {
    navigationEntries?: TagSelectionEntry[]
    searchEntries?: TagSelectionEntry[]
    isLoading?: boolean
    isSearching?: boolean
    isSubmittingDefinition?: boolean
    editTagDefinition?: RemoteInterface<TagDefinition | undefined>
}): TagSelectionState {
    return {
        navigationEntries: columnSelectionEntries,
        searchEntries: searchSelectionEntries,
        isLoading: isLoading,
        isSearching: isSearching,
        isSubmittingDefinition: isSubmittingDefinition,
        editTagDefinition
    }
}
