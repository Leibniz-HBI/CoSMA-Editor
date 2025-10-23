import {
    justificationColumn,
    displayTextColumn,
    displayTxtColumnId,
    justificationColumnId
} from '../table/state'
import { PublicUserInfo } from '../user/state'
import { RemoteInterface, newRemote } from '../util/state'

export enum ColumnType {
    String = 'STRING',
    Float = 'FLOAT',
    Boolean = 'BOOL',
    Inner = 'INNER'
}

export interface Column {
    namePath: string[]
    idPersistent: string
    idParentPersistent?: string
    columnType: ColumnType
    curated: boolean
    version: number
    owner?: PublicUserInfo
    description?: string
    hidden: boolean
    disabled: boolean
}

export function newColumn({
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
    columnType: ColumnType
    curated: boolean
    owner?: PublicUserInfo
    version: number
    description?: string
    hidden: boolean
    disabled?: boolean
}): Column {
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

export interface ColumnIdHierarchyNode {
    idColumnPersistent: string
    name: string
    isExpanded: boolean
    children: ColumnIdHierarchyNode[]
}
export function newColumnHierarchyNode({
    idColumnPersistent,
    name,
    isExpanded = false,
    children = []
}: {
    idColumnPersistent: string
    name: string
    isExpanded?: boolean
    children?: ColumnIdHierarchyNode[]
}) {
    return {
        idColumnPersistent,
        name,
        isExpanded,
        children
    }
}

export interface ColumnSelectionState {
    children: ColumnIdHierarchyNode[]
    columnsByIdPersistent: {
        [key: string]: RemoteInterface<Column | undefined>
    }
    isLoading: boolean
    isSubmittingDefinition: boolean
    editColumn: RemoteInterface<Column | undefined>
    isDragging: boolean
}
export function newColumnSelectionState({
    children = [],
    columnsByIdPersistent = {
        [displayTxtColumnId]: newRemote(displayTextColumn),
        [justificationColumnId]: newRemote(justificationColumn)
    },
    isLoading = false,
    isSubmittingDefinition = false,
    editColumn = newRemote(undefined),
    isDragging = false,
}: {
    children?: ColumnIdHierarchyNode[]
    columnsByIdPersistent?: {
        [key: string]: RemoteInterface<Column | undefined>
    }
    isLoading?: boolean
    isSubmittingDefinition?: boolean
    editColumn?: RemoteInterface<Column | undefined>
    draggedSelectionEntry?: ColumnIdHierarchyNode
    isDragging?: boolean
}): ColumnSelectionState {
    return {
        children,
        columnsByIdPersistent: columnsByIdPersistent,
        isLoading,
        isSubmittingDefinition,
        editColumn: editColumn,
        isDragging,
    }
}
