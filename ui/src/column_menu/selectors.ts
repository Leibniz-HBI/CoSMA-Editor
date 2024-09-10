import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { TagDefinition, TagHierarchyNode } from './state'
import { RemoteInterface } from '../util/state'

function selectTagSelection(state: RootState) {
    return state.tagSelection
}

export const selectNavigationEntries = createSelector(
    selectTagSelection,
    (state) => state.navigationEntries
)

export const selectTagSelectionLoading = createSelector(
    selectTagSelection,
    (state) => state.isLoading
)

export const selectEditTagDefinition = createSelector(
    selectTagSelection,
    (state) => state.editTagDefinition
)

export const selectIsDragging = createSelector(
    selectTagSelection,
    (state) => state.isDragging
)

const selectTagDefinitionByIdPersistentMap = createSelector(
    selectTagSelection,
    (state) => state.tagDefinitionsByIdPersistent
)

export const selectTagDefinitionByIdPersistent = createSelector(
    [
        selectTagDefinitionByIdPersistentMap,
        (_state, idPersistent: string) => idPersistent
    ],
    (state, idPersistent) => state[idPersistent]
)

export interface TagDefinitionHierarchyNode extends TagHierarchyNode {
    tagDefinition: RemoteInterface<TagDefinition | undefined>
    children: TagDefinitionHierarchyNode[]
}

export function newTagDefinitionHierarchyNode({
    idTagDefinitionPersistent,
    tagDefinition,
    name,
    isExpanded = false,
    children = []
}: {
    idTagDefinitionPersistent: string
    tagDefinition: RemoteInterface<TagDefinition>
    name: string
    isExpanded?: boolean
    children?: TagDefinitionHierarchyNode[]
}): TagDefinitionHierarchyNode {
    return {
        idTagDefinitionPersistent,
        tagDefinition,
        name,
        isExpanded,
        children
    }
}

function addTagDefinitionToHierarchy(
    tagDefinitionByIdPersistentMap: {
        [key: string]: RemoteInterface<TagDefinition | undefined>
    },
    tagHierarchyNodeList: TagHierarchyNode[]
): TagDefinitionHierarchyNode[] {
    const ret: TagDefinitionHierarchyNode[] = []
    const queue: {
        node: TagHierarchyNode
        targetArray: TagDefinitionHierarchyNode[]
    }[] = []
    for (let idx = tagHierarchyNodeList.length - 1; idx >= 0; idx--) {
        queue.push({ node: tagHierarchyNodeList[idx], targetArray: ret })
    }
    while (queue.length > 0) {
        const queueNode = queue.pop()
        if (queueNode !== undefined) {
            const { targetArray, node } = queueNode
            const childTargetArray: TagDefinitionHierarchyNode[] = []
            targetArray.push({
                ...node,
                tagDefinition:
                    tagDefinitionByIdPersistentMap[node.idTagDefinitionPersistent],
                children: childTargetArray
            })
            for (let idx = node.children.length - 1; idx >= 0; idx--) {
                queue.push({ node: node.children[idx], targetArray: childTargetArray })
            }
        }
    }
    return ret
}

export const selectTagDefinitionHierarchy = createSelector(
    [selectTagDefinitionByIdPersistentMap, selectNavigationEntries],
    (
        tagDefinitionsByIdPersistent: {
            [key: string]: RemoteInterface<TagDefinition | undefined>
        },
        hierarchy: TagHierarchyNode[]
    ) => addTagDefinitionToHierarchy(tagDefinitionsByIdPersistent, hierarchy)
)
