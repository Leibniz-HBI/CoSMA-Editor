import {
    justificationColumn,
    displayTextColumn,
    displayTxtColumnId,
    justificationColumnId
} from '../table/state'
import { PublicUserInfo } from '../user/state'
import { RemoteInterface, newRemote } from '../util/state'

export enum TagType {
    String = 'STRING',
    Float = 'FLOAT',
    Boolean = 'BOOL',
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
        namePath: namePath,
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

export interface TagHierarchyNode {
    idTagDefinitionPersistent: string
    name: string
    isExpanded: boolean
    children: TagHierarchyNode[]
}
export function newTagHierarchyNode({
    idTagDefinitionPersistent,
    name,
    isExpanded = false,
    children = []
}: {
    idTagDefinitionPersistent: string
    name: string
    isExpanded?: boolean
    children?: TagHierarchyNode[]
}) {
    return {
        idTagDefinitionPersistent,
        name,
        isExpanded,
        children
    }
}

export interface TagSelectionState {
    children: TagHierarchyNode[]
    tagDefinitionsByIdPersistent: {
        [key: string]: RemoteInterface<TagDefinition | undefined>
    }
    isLoading: boolean
    isSearching: boolean
    isSubmittingDefinition: boolean
    editTagDefinition: RemoteInterface<TagDefinition | undefined>
    isDragging: boolean
}
export function newTagSelectionState({
    children = [],
    tagDefinitionsByIdPersistent = {
        [displayTxtColumnId]: newRemote(displayTextColumn),
        [justificationColumnId]: newRemote(justificationColumn)
    },
    isLoading = false,
    isSearching = false,
    isSubmittingDefinition = false,
    editTagDefinition = newRemote(undefined),
    isDragging = false
}: {
    children?: TagHierarchyNode[]
    tagDefinitionsByIdPersistent?: {
        [key: string]: RemoteInterface<TagDefinition | undefined>
    }
    isLoading?: boolean
    isSearching?: boolean
    isSubmittingDefinition?: boolean
    editTagDefinition?: RemoteInterface<TagDefinition | undefined>
    draggedSelectionEntry?: TagHierarchyNode
    isDragging?: boolean
}): TagSelectionState {
    return {
        children,
        tagDefinitionsByIdPersistent,
        isLoading,
        isSearching,
        isSubmittingDefinition,
        editTagDefinition,
        isDragging
    }
}
