import { ColumnState, Entity, TableState } from './state'
import {
    SetEntitiesAction,
    AppendColumnAction,
    SetLoadDataErrorAction,
    SetEntityLoadingAction,
    SetColumnLoadingAction,
    TableAction,
    ShowColumnAddMenuAction,
    HideColumnAddMenuAction,
    ShowHeaderMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    ChangeColumnIndexAction,
    SubmitValuesStartAction,
    SubmitValuesEndAction,
    SubmitValuesErrorAction,
    CurateTagDefinitionStartAction,
    CurateTagDefinitionErrorAction,
    TagChangeOwnershipShowAction,
    TagChangeOwnershipHideAction,
    TagDefinitionChangeAction,
    ShowEntityAddDialogAction,
    EntityChangeOrCreateStartAction,
    EntityChangeOrCreateSuccessAction,
    EntityChangeOrCreateErrorAction,
    ToggleEntityModalAction,
    ToggleShowSearchAction
} from './actions'
import { Remote } from '../util/state'
import { TagDefinition } from '../column_menu/state'

export function tableReducer(state: TableState, action: TableAction) {
    if (action instanceof SetEntityLoadingAction) {
        return new TableState({
            ...state,
            isLoading: true
        })
    } else if (action instanceof SetEntitiesAction) {
        const entityIndices = new Map(
            action.entities.map((entity: Entity, idx: number) => [
                entity.idPersistent,
                idx
            ])
        )
        return new TableState({
            ...state,
            entities: action.entities,
            entityIndices: entityIndices,
            isLoading: false
        })
    } else if (action instanceof AppendColumnAction) {
        const col_idx = state.columnIndices.get(action.idPersistent)
        if (col_idx !== undefined) {
            return new TableState({
                ...state,
                columnStates: [
                    ...state.columnStates.slice(0, col_idx),
                    new ColumnState({
                        ...state.columnStates[col_idx],
                        cellContents: state.columnStates[col_idx].cellContents.success(
                            state.entities?.map((entity) =>
                                entity.idPersistent in action.columnData
                                    ? action.columnData[entity.idPersistent]
                                    : []
                            ) ?? []
                        )
                    }),
                    ...state.columnStates.slice(col_idx + 1)
                ]
            })
        }
    } else if (action instanceof SetColumnLoadingAction) {
        const idTagDefinitionPersistent = action.tagDefinition.idPersistent
        const column_idx =
            state.columnIndices.get(idTagDefinitionPersistent) ??
            state.columnStates.length
        const newColumnIndices = new Map(state.columnIndices)
        newColumnIndices.set(idTagDefinitionPersistent, column_idx)
        return new TableState({
            ...state,
            columnIndices: newColumnIndices,
            columnStates: [
                ...state.columnStates.slice(0, column_idx),
                new ColumnState({
                    tagDefinition: action.tagDefinition,
                    cellContents: new Remote([], true)
                }),
                ...state.columnStates.slice(column_idx + 1)
            ]
        })
    } else if (action instanceof ShowColumnAddMenuAction) {
        return new TableState({
            ...state,
            showColumnAddMenu: true
        })
    } else if (action instanceof HideColumnAddMenuAction) {
        return new TableState({
            ...state,
            showColumnAddMenu: false
        })
    } else if (action instanceof ShowHeaderMenuAction) {
        return new TableState({
            ...state,
            selectedTagDefinition: state.columnStates[action.columnIndex].tagDefinition,
            selectedColumnHeaderBounds: action.bounds
        })
    } else if (action instanceof HideHeaderMenuAction) {
        return new TableState({
            ...state,
            selectedTagDefinition: undefined,
            selectedColumnHeaderBounds: undefined
        })
    } else if (action instanceof RemoveSelectedColumnAction) {
        if (state.selectedTagDefinition === undefined) {
            return new TableState({
                ...state,
                selectedColumnHeaderBounds: undefined,
                selectedTagDefinition: undefined
            })
        }
        const columnIdx = state.columnIndices.get(
            state.selectedTagDefinition.idPersistent
        )
        if (columnIdx === undefined) {
            return new TableState({
                ...state,
                selectedColumnHeaderBounds: undefined,
                selectedTagDefinition: undefined
            })
        }

        const columnStates = [
            ...state.columnStates.slice(undefined, columnIdx),
            ...state.columnStates.slice(columnIdx + 1, undefined)
        ]
        const columnIndices = new Map<string, number>()
        for (let idx = 0; idx < columnStates.length; ++idx) {
            columnIndices.set(columnStates[idx].tagDefinition.idPersistent, idx)
        }
        return new TableState({
            ...state,
            columnStates: columnStates,
            columnIndices: columnIndices,
            selectedColumnHeaderBounds: undefined,
            selectedTagDefinition: undefined
        })
    } else if (action instanceof SetColumnWidthAction) {
        return new TableState({
            ...state,
            columnStates: [
                ...state.columnStates.slice(0, action.columnIdx),
                new ColumnState({
                    ...state.columnStates[action.columnIdx],
                    width: action.width
                }),
                ...state.columnStates.slice(action.columnIdx + 1)
            ]
        })
    } else if (action instanceof ChangeColumnIndexAction) {
        if (action.endIndex == action.startIndex) {
            return state
        }
        if (
            action.endIndex < state.frozenColumns ||
            action.startIndex < state.frozenColumns
        ) {
            return state
        }
        let newColumnStates
        if (action.startIndex > action.endIndex) {
            newColumnStates = [
                ...state.columnStates.slice(0, action.endIndex),
                state.columnStates[action.startIndex],
                ...state.columnStates.slice(action.endIndex, action.startIndex),
                ...state.columnStates.slice(action.startIndex + 1)
            ]
        } else {
            newColumnStates = [
                ...state.columnStates.slice(0, action.startIndex),
                ...state.columnStates.slice(action.startIndex + 1, action.endIndex + 1),
                state.columnStates[action.startIndex],
                ...state.columnStates.slice(action.endIndex + 1)
            ]
        }
        const newColumnIndices = new Map<string, number>()
        for (let idx = 0; idx < newColumnStates.length; ++idx) {
            newColumnIndices.set(newColumnStates[idx].tagDefinition.idPersistent, idx)
        }
        return new TableState({
            ...state,
            columnStates: newColumnStates,
            columnIndices: newColumnIndices
        })
    } else if (action instanceof SetLoadDataErrorAction) {
        return new TableState({
            ...state,
            isLoading: false,
            rowObjects: undefined
        })
    } else if (action instanceof SubmitValuesStartAction) {
        return new TableState({
            ...state,
            isSubmittingValues: true
        })
    } else if (action instanceof SubmitValuesErrorAction) {
        return new TableState({
            ...state,
            isSubmittingValues: false
        })
    } else if (action instanceof SubmitValuesEndAction) {
        if (action.edits.length != 1) {
            return new TableState({ ...state, isSubmittingValues: false })
        }
        const [idEntity, idPersistentColumn, value] = action.edits[0]
        const idxColumn = state.columnIndices.get(idPersistentColumn)
        if (idxColumn === undefined) {
            return state
        }
        const idxEntity = state.entityIndices.get(idEntity)
        if (idxEntity === undefined) {
            return state
        }
        return new TableState({
            ...state,
            isSubmittingValues: false,
            columnStates: [
                ...state.columnStates.slice(0, idxColumn),
                new ColumnState({
                    ...state.columnStates[idxColumn],
                    cellContents: new Remote([
                        ...state.columnStates[idxColumn].cellContents.value.slice(
                            0,
                            idxEntity
                        ),
                        [value],
                        ...state.columnStates[idxColumn].cellContents.value.slice(
                            idxEntity + 1
                        )
                    ])
                }),
                ...state.columnStates.slice(idxColumn + 1)
            ]
        })
    }
    if (action instanceof CurateTagDefinitionStartAction) {
        return state
    }
    if (action instanceof TagDefinitionChangeAction) {
        const newColumnStates = updateTagDefinition(
            state.columnStates,
            state.columnIndices,
            action.tagDefinition
        )
        if (newColumnStates == undefined) {
            return state
        }
        return new TableState({
            ...state,
            columnStates: newColumnStates
        })
    }
    if (action instanceof CurateTagDefinitionErrorAction) {
        return state
    }
    if (action instanceof TagChangeOwnershipShowAction) {
        return new TableState({
            ...state,
            ownershipChangeTagDefinition: action.columnDefinition
        })
    }
    if (action instanceof TagChangeOwnershipHideAction) {
        return new TableState({ ...state, ownershipChangeTagDefinition: undefined })
    }
    if (action instanceof ShowEntityAddDialogAction) {
        return new TableState({
            ...state,
            showEntityAddDialog: action.show,
            entityAddState: new Remote(false)
        })
    }
    if (action instanceof ToggleShowSearchAction) {
        return new TableState({ ...state, showSearch: action.show })
    }
    if (action instanceof EntityChangeOrCreateStartAction) {
        return new TableState({
            ...state,
            entityAddState: state.entityAddState.startLoading()
        })
    }
    if (action instanceof EntityChangeOrCreateSuccessAction) {
        const entity = action.entity
        const idx = state.entityIndices.get(entity.idPersistent)
        let newEntities
        let newColumnStates
        if (state.entities === undefined) {
            newEntities = [action.entity]
            newColumnStates = appendDisplayTextToColumnState(state.columnStates, entity)
        } else {
            if (idx === undefined) {
                newEntities = [...state.entities, action.entity]
                newColumnStates = appendDisplayTextToColumnState(
                    state.columnStates,
                    entity
                )
            } else {
                newEntities = [
                    ...state.entities.slice(0, idx),
                    action.entity,
                    ...state.entities.slice(idx + 1)
                ]
                newColumnStates = [
                    new ColumnState({
                        ...state.columnStates[0],
                        cellContents: state.columnStates[0].cellContents.map(
                            (cellContents) => [
                                ...cellContents.slice(0, idx),
                                [
                                    {
                                        value: entity.displayTxt,
                                        idPersistent: entity.idPersistent,
                                        version: entity.version
                                    }
                                ],
                                ...cellContents.slice(idx + 1)
                            ]
                        )
                    }),
                    ...state.columnStates.slice(1)
                ]
            }
        }
        return new TableState({
            ...state,
            entities: newEntities,
            columnStates: newColumnStates,
            entityAddState: state.entityAddState.success(true)
        })
    }
    if (action instanceof EntityChangeOrCreateErrorAction) {
        return new TableState({
            ...state,
            entityAddState: state.entityAddState.withError(undefined)
        })
    }
    if (action instanceof ToggleEntityModalAction) {
        return new TableState({ ...state, showEntityMergingModal: action.show })
    }
    return state
}

function appendDisplayTextToColumnState(
    columnStates: ColumnState[],
    entity: Entity
): ColumnState[] {
    return [
        new ColumnState({
            ...columnStates[0],
            cellContents: columnStates[0].cellContents.map((cellContents) => [
                ...cellContents,
                [
                    {
                        value: entity.displayTxt,
                        idPersistent: entity.idPersistent,
                        version: entity.version
                    }
                ]
            ])
        }),
        ...columnStates.slice(1).map(
            (columnState) =>
                new ColumnState({
                    ...columnState,
                    cellContents: columnState.cellContents.map((cellContents) => [
                        ...cellContents,
                        []
                    ])
                })
        )
    ]
}

function updateTagDefinition(
    columnStates: ColumnState[],
    columnIndices: Map<string, number>,
    tagDefinition: TagDefinition
) {
    const idxColumnState = columnIndices.get(tagDefinition.idPersistent)
    if (idxColumnState === undefined) {
        return undefined
    }
    return [
        ...columnStates.slice(0, idxColumnState),
        new ColumnState({
            ...columnStates[idxColumnState],
            tagDefinition: {
                ...columnStates[idxColumnState].tagDefinition,
                curated: tagDefinition.curated
            }
        }),
        ...columnStates.slice(idxColumnState + 1)
    ]
}
