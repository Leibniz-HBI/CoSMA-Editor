import {
    CustomCell,
    EditableGridCell,
    GridCell,
    GridCellKind,
    GridColumn,
    Item,
    Rectangle
} from '@glideapps/glide-data-grid'
import { TagDefinition, TagType } from '../column_menu/state'
import { addError } from '../util/notification/slice'
import { Remote, ThunkMiddlewareDispatch, useThunkReducer } from '../util/state'
import {
    ChangeColumnIndexAction,
    HideColumnAddMenuAction,
    HideHeaderMenuAction,
    RemoveSelectedColumnAction,
    SetColumnWidthAction,
    SetLoadDataErrorAction,
    ShowColumnAddMenuAction,
    ShowEntityAddDialogAction,
    ShowHeaderMenuAction,
    TableAction,
    TagChangeOwnershipHideAction,
    TagChangeOwnershipShowAction,
    TagDefinitionChangeAction,
    ToggleEntityModalAction,
    ToggleShowSearchAction
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
import { UserInfo, UserPermissionGroup } from '../user/state'
import { LoadingType } from './draw'
import { useSelector } from 'react-redux'
import { selectPermissionGroup } from '../user/selectors'
import {
    remoteUserProfileChangeColumIndex,
    remoteUserProfileColumnAppend,
    remoteUserProfileColumnDelete
} from '../user/thunks'
import { AppDispatch } from '../store'
import { useAppDispatch } from '../hooks'

const emptyCell = {
    kind: 'text' as GridCellKind,
    allowOverlay: false,
    displayData: '',
    data: ''
} as GridCell

export function mkCell(columnType: TagType, cellValues?: CellValue[]): GridCell {
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
    if (columnType == TagType.Inner) {
        // workaround for typescript jest compatibility
        allowOverlay = false
        cellKind = 'boolean' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
        } else {
            cellContent = cellValues[0].value
        }
    } else if (columnType == TagType.Float) {
        // workaround for typescript jest compatibility
        cellKind = 'number' as GridCellKind
        if (cellValues.length == 0) {
            cellContent = undefined
            displayData = ''
        } else {
            cellContent = cellValues[0].value
            displayData = cellContent?.toString()
        }
    } else if (columnType == TagType.String) {
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
    addColumnCallback: (columnDefinition: TagDefinition) => void
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
    csvLines: () => string[]
    hideTagDefinitionOwnershipCallback: VoidFunction
    updateTagDefinitionCallback: (tagDefinition: TagDefinition) => void
    showEntityAddMenuCallback: VoidFunction
    hideEntityAddMenuCallback: VoidFunction
    showEntityMergingModalCallback: VoidFunction
    hideEntityMergingModalCallback: VoidFunction
    toggleSearchCallback: (show: boolean) => void
}
export type TableDataProps = {
    entities?: Entity[]
    columnStates: ColumnState[]
    columnIndices: Map<string, number>
    frozenColumns: number
    selectedColumnHeaderBounds?: Rectangle
    isShowColumnAddMenu: boolean
    isLoading: boolean
    columnHeaderMenuEntries: ColumnHeaderMenuItem[]
    tagDefinitionChangeOwnership?: TagDefinition
    showEntityAddMenu: boolean
    entityAddState: Remote<boolean>
    showEntityMergingModal: boolean
    showSearch: boolean
}

export interface ColumnHeaderMenuItem {
    label: string
    onClick: VoidFunction
    labelClassName?: string
}

export function mkColumnHeaderMenuEntries(
    permissionGroup: UserPermissionGroup | undefined,
    dispatch: ThunkMiddlewareDispatch<TableAction>,
    reduxDispatch: AppDispatch,
    tagDefinitionSelected?: TagDefinition
): ColumnHeaderMenuItem[] {
    if (tagDefinitionSelected === undefined) {
        return []
    }
    const ret = [
        {
            label: 'Hide Column',
            labelClassName: 'danger text-danger',
            onClick: () => {
                dispatch(new RemoveSelectedColumnAction())
                reduxDispatch(
                    remoteUserProfileColumnDelete(tagDefinitionSelected.idPersistent)
                )
            }
        },
        {
            label: 'Change Owner',
            labelClassName: '',
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
            labelClassName: '',
            onClick: () => {
                dispatch(new CurateAction(tagDefinitionSelected.idPersistent))
            }
        })
    }
    return ret
}

export function useRemoteTableData(
    userInfoPromise: () => Promise<UserInfo | undefined>
): [RemoteTableCallbacks, LocalTableCallbacks, TableDataProps] {
    const reduxDispatch = useAppDispatch()
    const [state, dispatch] = useThunkReducer(
        tableReducer,
        new TableState({ frozenColumns: 1 }),
        reduxDispatch
    )
    const permissionGroup = useSelector(selectPermissionGroup)
    const columnMenuEntries = mkColumnHeaderMenuEntries(
        permissionGroup,
        dispatch,
        reduxDispatch,
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
                        dispatch(new SetLoadDataErrorAction())
                        reduxDispatch(addError('Please refresh the page and log in'))
                        return
                    }
                    await dispatch(new GetTableAsyncAction())
                    userInfo?.columns.forEach(async (col: TagDefinition) => {
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
                if (colIdx == 0) {
                    const entity = state.entities[rowIdx]
                    let newValueData: string | undefined = newValue.data?.toString()
                    if (newValueData == '') {
                        newValueData = undefined
                    }
                    dispatch(
                        new EntityChangeOrCreateAction({
                            disabled: entity.disabled,
                            idPersistent: entity.idPersistent,
                            version: entity.version,
                            displayTxt: newValueData
                        })
                    )
                } else {
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
                }
            },
            addEntityCallback: (displayTxtArg) => {
                let displayTxt: string | undefined = displayTxtArg
                if (displayTxt == '') {
                    displayTxt = undefined
                }
                dispatch(
                    new EntityChangeOrCreateAction({
                        displayTxt: displayTxt,
                        disabled: false
                    })
                )
            }
        },
        {
            cellContentCallback: useCellContentCallback(state),
            addColumnCallback: (columnDefinition: TagDefinition) =>
                dispatch(new GetColumnAsyncAction(columnDefinition)).then(() =>
                    reduxDispatch(
                        remoteUserProfileColumnAppend(columnDefinition.idPersistent)
                    )
                ),
            showColumnAddMenuCallback: () => dispatch(new ShowColumnAddMenuAction()),
            hideColumnAddMenuCallback: () => dispatch(new HideColumnAddMenuAction()),
            showHeaderMenuCallback: (columnIdx: number, bounds: Rectangle) => {
                dispatch(new ShowHeaderMenuAction(columnIdx, bounds))
            },
            hideHeaderMenuCallback: () => dispatch(new HideHeaderMenuAction()),
            removeColumnCallback: () => {
                if (state.selectedTagDefinition) {
                    dispatch(new RemoveSelectedColumnAction())
                    reduxDispatch(
                        remoteUserProfileColumnDelete(
                            state.selectedTagDefinition.idPersistent
                        )
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
                reduxDispatch(remoteUserProfileChangeColumIndex(startIndex, endIndex))
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
            showEntityMergingModalCallback: () =>
                dispatch(new ToggleEntityModalAction(true)),
            hideEntityMergingModalCallback: () =>
                dispatch(new ToggleEntityModalAction(false)),
            toggleSearchCallback: (show: boolean) =>
                dispatch(new ToggleShowSearchAction(show))
        },
        {
            entities: state.entities,
            columnStates: state.columnStates,
            columnIndices: state.columnIndices,
            frozenColumns: state.frozenColumns,
            isShowColumnAddMenu: state.showColumnAddMenu,
            selectedColumnHeaderBounds: state.selectedColumnHeaderBounds,
            isLoading: isLoading,
            columnHeaderMenuEntries: columnMenuEntries,
            tagDefinitionChangeOwnership: state.ownershipChangeTagDefinition,
            showEntityAddMenu: state.showEntityAddDialog,
            entityAddState: state.entityAddState,
            showEntityMergingModal: state.showEntityMergingModal,
            showSearch: state.showSearch
        }
    ]
}
