import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { Column, ColumnIdHierarchyNode } from './state'
import { RemoteInterface } from '../util/state'
import { mkUpUntilDateColumnId } from '../util/misc'

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
        [
            selectColumnByIdPersistentMap,
            (_state, idPersistent: string, upUntilDate: Date | undefined) => ({
                idPersistent,
                upUntilDate
            })
        ],
        (state, keyParts) =>
            state[mkUpUntilDateColumnId(keyParts.idPersistent, keyParts.upUntilDate)]
    )
    return selector
}

export const makeSelectColumnByIdPersistentList = () => {
    const selector = createSelector(
        [
            selectColumnByIdPersistentMap,
            (_state, idPersistentList: string[], upUntilTime: Date | undefined) => ({
                idPersistentList,
                upUntilTime
            })
        ],
        (state, args) =>
            args.idPersistentList.map(
                (idPersistent: string) =>
                    state[mkUpUntilDateColumnId(idPersistent, args.upUntilTime)]
            )
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
        [key: string]: RemoteInterface<Column | undefined>
    },
    columnHierarchyNodeList: ColumnIdHierarchyNode[],
    upUntilDate: Date | undefined
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
                column: columnByIdPersistentMap[
                    mkUpUntilDateColumnId(node.idColumnPersistent, upUntilDate)
                ],
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
    [
        selectColumnByIdPersistentMap,
        selectNavigationEntries,
        (_state: RootState, upUntilDate: Date | undefined) => upUntilDate
    ],
    (
        columnsByIdPersistent: {
            [key: string]: RemoteInterface<Column | undefined>
        },
        hierarchy: ColumnIdHierarchyNode[],
        upUntilDate: Date | undefined
    ) => addColumnToHierarchy(columnsByIdPersistent, hierarchy, upUntilDate)
)
