import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { Column, ColumnIdHierarchyNode } from './state'
import { RemoteInterface } from '../util/state'

function selectColumnSelection(state: RootState) {
    return state.columnSelection
}

export const selectNavigationEntries = createSelector(
    selectColumnSelection,
    (state) => state.children
)

export const selectColumnSelectionLoading = createSelector(
    selectColumnSelection,
    (state) => state.isLoading
)

export const selectEditColumnDefinition = createSelector(
    selectColumnSelection,
    (state) => state.editColumn
)

export const selectIsDragging = createSelector(
    selectColumnSelection,
    (state) => state.isDragging
)

const selectColumnByIdPersistentMap = createSelector(
    selectColumnSelection,
    (state) => state.columnsByIdPersistent
)

export const makeSelectColumnByIdPersistent = () => {
    const selector = createSelector(
        [selectColumnByIdPersistentMap, (_state, idPersistent: string) => idPersistent],
        (state, idPersistent) => state[idPersistent]
    )
    return selector
}

export const makeSelectColumnByIdPersistentList = () => {
    const selector = createSelector(
        [
            selectColumnByIdPersistentMap,
            (_state, idPersistentList: string[]) => idPersistentList
        ],
        (state, idPersistentList) =>
            idPersistentList.map((idPersistent: string) => state[idPersistent])
    )
    return selector
}

export interface ColumnHierarchyNode extends ColumnIdHierarchyNode {
    column: RemoteInterface<Column | undefined>
    children: ColumnHierarchyNode[]
}

export function newColumnIdHierarchyNode({
    idColumnPersistent,
    column,
    name,
    isExpanded = false,
    children = []
}: {
    idColumnPersistent: string
    column: RemoteInterface<Column>
    name: string
    isExpanded?: boolean
    children?: ColumnHierarchyNode[]
}): ColumnHierarchyNode {
    return {
        idColumnPersistent,
        column: column,
        name,
        isExpanded,
        children
    }
}

function addColumnToHierarchy(
    columnByIdPersistentMap: {
        [key: string]: RemoteInterface<Column| undefined>
    },
    columnHierarchyNodeList: ColumnIdHierarchyNode[]
): ColumnHierarchyNode[] {
    const ret: ColumnHierarchyNode[] = []
    const queue: {
        node: ColumnIdHierarchyNode
        targetArray: ColumnHierarchyNode[]
    }[] = []
    for (let idx = columnHierarchyNodeList.length - 1; idx >= 0; idx--) {
        queue.push({ node: columnHierarchyNodeList[idx], targetArray: ret })
    }
    while (queue.length > 0) {
        const queueNode = queue.pop()
        if (queueNode !== undefined) {
            const { targetArray, node } = queueNode
            const childTargetArray: ColumnHierarchyNode[] = []
            targetArray.push({
                ...node,
                column:
                    columnByIdPersistentMap[node.idColumnPersistent],
                children: childTargetArray
            })
            for (let idx = node.children.length - 1; idx >= 0; idx--) {
                queue.push({ node: node.children[idx], targetArray: childTargetArray })
            }
        }
    }
    return ret
}

export const selectColumnHierarchy = createSelector(
    [selectColumnByIdPersistentMap, selectNavigationEntries],
    (
        columnsByIdPersistent: {
            [key: string]: RemoteInterface<Column | undefined>
        },
        hierarchy: ColumnIdHierarchyNode[]
    ) => addColumnToHierarchy(columnsByIdPersistent, hierarchy)
)
