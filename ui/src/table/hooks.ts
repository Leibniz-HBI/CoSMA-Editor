import {
    CustomCell,
    EditableGridCell,
    GridCell,
    GridCellKind,
    GridColumn,
    Item,
    Rectangle
} from '@glideapps/glide-data-grid'
import { ColumnDefinition, ColumnType } from '../column_menu/state'
import { newErrorState, ErrorState } from '../util/error/slice'
import { Remote, ThunkMiddlewareDispatch, useThunkReducer } from '../util/state'
import {
    ChangeColumnIndexAction,
    EntityChangeOrCreateClearErrorAction,
    HideColumnAddMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    SetLoadDataErrorAction,
    ShowColumnAddMenuAction,
    ShowEntityAddDialogAction,
    ShowHeaderMenuAction,
    SubmitValuesClearErrorAction,
    TableAction,
    TagChangeOwnershipHideAction,
    TagChangeOwnershipShowAction,
    TagDefinitionChangeAction
} from './actions'
import {
    CurateAction,
    EntityChangeOrCreateAction,
    GetColumnAsyncAction,
    GetTableAsyncAction,
    SubmitValuesAsyncAction
} from './async_actions'
import { tableReducer } from './reducer'
import { CellValue, ColumnState, Entity, TableState } from './state'
import { DefaultTagDefinitionsCallbacks } from '../user/hooks'
import { UserInfo, UserPermissionGroup } from '../user/state'
import { LoadingType } from './draw'
import { useSelector } from 'react-redux'
import { selectPermissionGroup } from '../user/selectors'

const emptyCell = {
    kind: 'text' as GridCellKind,
    allowOverlay: false,
    displayData: '',
    data: ''
} as GridCell

export function mkCell(columnType: ColumnType, cellValues?: CellValue[]): GridCell {
    // workaround for typescript jest compatibility
    let cellKind = 'text' as GridCellKind
    let allowOverlay = true
    let cellContent
    let displayData: string | undefined = undefined
    if (cellValues === undefined) {
        return {
            kind: cellKind as GridCellKind,
            allowOverlay: allowOverlay,
            displayData: '',
            data: ''
        } as GridCell
    }
    if (columnType == ColumnType.Inner) {
        // workaround for typescript jest compatibility
        allowOverlay = false
        cellKind = 'boolean' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
        } else {
            cellContent = cellValues[0].value
        }
    } else if (columnType == ColumnType.Float) {
        // workaround for typescript jest compatibility
        cellKind = 'number' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
            displayData = ''
        } else {
            cellContent = cellValues[0].value
            displayData = cellContent?.toString()
        }
    } else if (columnType == ColumnType.String) {
        if (cellValues.length == 0) {
            cellContent = ''
            displayData = ''
        } else {
            if (cellValues.length < 2) {
                cellContent = cellValues[0].value
                displayData = cellContent?.toString() ?? ''
                if (cellContent === undefined || cellContent === null) {
                    cellContent = ''
                }
            } else {
                // workaround for typescript jest compatibility
                cellKind = 'bubble' as GridCellKind
                cellContent = cellValues.map((value) => value.value)
                displayData = ''
            }
        }
    }
    return {
        kind: cellKind as GridCellKind,
        allowOverlay: allowOverlay,
        displayData: displayData,
        data: cellContent
    } as GridCell
}

const loadingInstance = new LoadingType()

export function useCellContentCallback(state: TableState): (cell: Item) => GridCell {
    return (cell: Item): GridCell => {
        const [col_idx, row_idx] = cell
        const col = state.columnStates[col_idx]
        if (col === undefined) {
            return emptyCell
        }
        if (col.cellContents.isLoading) {
            return {
                kind: 'custom' as GridCellKind,
                allowOverlay: true,
                style: 'faded',
                data: loadingInstance
            } as CustomCell<LoadingType>
        }
        return mkCell(col.tagDefinition.columnType, col.cellContents.value[row_idx])
    }
}

export type RemoteTableCallbacks = {
    loadTableDataCallback: VoidFunction
    submitValueCallback: (cell: Item, newValue: EditableGridCell) => void
    addEntityCallback: (displayTxt: string) => void
}
export type LocalTableCallbacks = {
    cellContentCallback: (cell: Item) => GridCell
    addColumnCallback: (columnDefinition: ColumnDefinition) => void
    showColumnAddMenuCallback: VoidFunction
    hideColumnAddMenuCallback: VoidFunction
    showHeaderMenuCallback: (columnIdx: number, bounds: Rectangle) => void
    hideHeaderMenuCallback: VoidFunction
    removeColumnCallback: VoidFunction
    setColumnWidthCallback: (
        column: GridColumn,
        newSize: number,
        colIndex: number,
        newSizeWithGrow: number
    ) => void
    switchColumnsCallback: (startIndex: number, endIndex: number) => void
    columnHeaderBoundsCallback: () => {
        left: number
        right: number
        top: number
        bottom: number
        width: number
        height: number
    }
    clearSubmitValueErrorCallback: VoidFunction
    csvLines: () => string[]
    hideTagDefinitionOwnershipCallback: VoidFunction
    updateTagDefinitionCallback: (tagDefinition: ColumnDefinition) => void
    showEntityAddMenuCallback: VoidFunction
    hideEntityAddMenuCallback: VoidFunction
    clearEntityChangeErrorCallback: VoidFunction
}
export type TableDataProps = {
    entities?: Entity[]
    columnStates: ColumnState[]
    columnIndices: Map<string, number>
    frozenColumns: number
    selectedColumnHeaderBounds?: Rectangle
    isShowColumnAddMenu: boolean
    isLoading: boolean
    loadDataErrorState?: ErrorState
    submitValuesErrorState?: ErrorState
    columnHeaderMenuEntries: ColumnHeaderMenuItem[]
    tagDefinitionChangeOwnership?: ColumnDefinition
    showEntityAddMenu: boolean
    entityAddState: Remote<boolean>
}

export interface ColumnHeaderMenuItem {
    label: string
    onClick: VoidFunction
    labelClassName?: string
}

function mkColumnHeaderMenuEntries(
    permissionGroup: UserPermissionGroup | undefined,
    dispatch: ThunkMiddlewareDispatch<TableAction>,
    tagDefinitionSelected?: ColumnDefinition
): ColumnHeaderMenuItem[] {
    if (tagDefinitionSelected === undefined) {
        return []
    }
    const ret = [
        {
            label: 'Hide Column',
            className: 'danger text-danger',
            onClick: () => {
                dispatch(new RemoveSelectedColumnAction())
            }
        },
        {
            label: 'Change Owner',
            className: '',
            onClick: () =>
                dispatch(new TagChangeOwnershipShowAction(tagDefinitionSelected))
        }
    ]
    if (
        permissionGroup == UserPermissionGroup.EDITOR ||
        permissionGroup == UserPermissionGroup.COMMISSIONER
    ) {
        ret.push({
            label: 'Curate Tag Definition',
            className: '',
            onClick: () => {
                dispatch(new CurateAction(tagDefinitionSelected.idPersistent))
            }
        })
    }
    return ret
}

export function useRemoteTableData(
    userInfoPromise: () => Promise<UserInfo | undefined>,
    defaultColumnCallbacks: DefaultTagDefinitionsCallbacks
): [RemoteTableCallbacks, LocalTableCallbacks, TableDataProps] {
    const [state, dispatch] = useThunkReducer(
        tableReducer,
        new TableState({ frozenColumns: 1 })
    )
    const permissionGroup = useSelector(selectPermissionGroup)
    const columnMenuEntries = mkColumnHeaderMenuEntries(
        permissionGroup,
        dispatch,
        state.selectedTagDefinition
    )
    const isLoading = state.isLoading || false
    return [
        {
            loadTableDataCallback: () => {
                if (state.entities !== undefined || isLoading) {
                    return
                }
                userInfoPromise().then(async (userInfo) => {
                    if (userInfo === undefined) {
                        dispatch(
                            new SetLoadDataErrorAction(
                                newErrorState('Please refresh the page and log in')
                            )
                        )
                    }
                    await dispatch(new GetTableAsyncAction())
                    userInfo?.columns.forEach(async (col: ColumnDefinition) => {
                        const idPersistent = col.idPersistent
                        const colStateIdx = state.columnIndices.get(idPersistent)
                        const colState = state.columnStates[colStateIdx ?? -1]
                        if (
                            state.isLoading ||
                            colState?.cellContents.isLoading ||
                            colState?.cellContents.value.length > 0
                        ) {
                            return
                        }
                        await dispatch(new GetColumnAsyncAction(col))
                    })
                })
            },
            submitValueCallback: (cell, newValue) => {
                if (state.entities === undefined || state.isSubmittingValues) {
                    return
                }
                const [colIdx, rowIdx] = cell
                dispatch(
                    new SubmitValuesAsyncAction(
                        state.columnStates[colIdx].tagDefinition.columnType,
                        [
                            state.entities[rowIdx].idPersistent,
                            state.columnStates[colIdx].tagDefinition.idPersistent,
                            {
                                ...state.columnStates[colIdx].cellContents.value[
                                    rowIdx
                                ][0],
                                value: newValue.data?.toString()
                            }
                        ]
                    )
                )
            },
            addEntityCallback: (displayTxt) =>
                dispatch(new EntityChangeOrCreateAction({ displayTxt: displayTxt }))
        },
        {
            cellContentCallback: useCellContentCallback(state),
            addColumnCallback: (columnDefinition: ColumnDefinition) =>
                dispatch(new GetColumnAsyncAction(columnDefinition)).then(() =>
                    defaultColumnCallbacks.appendToDefaultTagDefinitionsCallback(
                        columnDefinition.idPersistent
                    )
                ),
            showColumnAddMenuCallback: () => dispatch(new ShowColumnAddMenuAction()),
            hideColumnAddMenuCallback: () => dispatch(new HideColumnAddMenuAction()),
            showHeaderMenuCallback: (columnIdx: number, bounds: Rectangle) => {
                dispatch(new ShowHeaderMenuAction(columnIdx, bounds))
            },
            hideHeaderMenuCallback: () => dispatch(new HideHeaderMenuAction()),
            removeColumnCallback: () => {
                dispatch(new RemoveSelectedColumnAction())
                if (state.selectedTagDefinition) {
                    defaultColumnCallbacks.removeFromDefaultTagDefinitionListCallback(
                        state.selectedTagDefinition.idPersistent
                    )
                }
            },
            setColumnWidthCallback: (
                column: GridColumn,
                newSize: number,
                colIndex: number,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                newSizeWithGrow: number
            ) => dispatch(new SetColumnWidthAction(colIndex, newSize)),
            switchColumnsCallback: (startIndex: number, endIndex: number) => {
                dispatch(new ChangeColumnIndexAction(startIndex, endIndex))
                defaultColumnCallbacks.changeDefaultTagDefinitionsCallback(
                    startIndex,
                    endIndex
                )
            },
            columnHeaderBoundsCallback: () => ({
                left: state.selectedColumnHeaderBounds?.x ?? 0,
                top: state.selectedColumnHeaderBounds?.y ?? 0,
                width: state.selectedColumnHeaderBounds?.width ?? 0,
                height: state.selectedColumnHeaderBounds?.height ?? 0,
                right:
                    (state.selectedColumnHeaderBounds?.x ?? 0) +
                    (state.selectedColumnHeaderBounds?.width ?? 0),
                bottom:
                    (state.selectedColumnHeaderBounds?.y ?? 0) +
                    (state.selectedColumnHeaderBounds?.height ?? 0)
            }),
            clearSubmitValueErrorCallback: () =>
                dispatch(new SubmitValuesClearErrorAction()),
            csvLines: () => {
                return state.csvLines()
            },
            hideTagDefinitionOwnershipCallback: () =>
                dispatch(new TagChangeOwnershipHideAction()),
            updateTagDefinitionCallback: (tagDefinition) =>
                dispatch(new TagDefinitionChangeAction(tagDefinition)),
            showEntityAddMenuCallback: () =>
                dispatch(new ShowEntityAddDialogAction(true)),
            hideEntityAddMenuCallback: () =>
                dispatch(new ShowEntityAddDialogAction(false)),
            clearEntityChangeErrorCallback: () =>
                dispatch(new EntityChangeOrCreateClearErrorAction())
        },
        {
            entities: state.entities,
            columnStates: state.columnStates,
            columnIndices: state.columnIndices,
            frozenColumns: state.frozenColumns,
            isShowColumnAddMenu: state.showColumnAddMenu,
            selectedColumnHeaderBounds: state.selectedColumnHeaderBounds,
            loadDataErrorState: state.loadDataErrorState,
            submitValuesErrorState: state.submitValuesErrorState,
            isLoading: isLoading,
            columnHeaderMenuEntries: columnMenuEntries,
            tagDefinitionChangeOwnership: state.ownershipChangeTagDefinition,
            showEntityAddMenu: state.showEntityAddDialog,
            entityAddState: state.entityAddState
        }
    ]
}
