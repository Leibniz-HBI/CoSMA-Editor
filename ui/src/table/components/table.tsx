import {
    DataEditor,
    EditableGridCell,
    GridColumn,
    GridMouseEventArgs,
    Item,
    Rectangle
} from '@glideapps/glide-data-grid'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import { IBounds, useLayer } from 'react-laag'
import { ColumnAddButton } from '../../column_menu/components/misc'
import { HeaderMenu } from '../../header_menu'
import { loadingCellRenderer } from '../draw'
import { ChangeOwnershipModal } from '../../column_management/components'
import { MergeEntitiesButton } from './buttons'
import { mkGridSelectionCallback } from '../selection/slice'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '../../store'
import { selectTableSelection } from '../selection/selectors'
import { constructColumnTitle } from '../../contribution/entity/hooks'
import { useAppDispatch, useAppSelector } from '../../hooks'
import {
    selectColumnHeaderMenu,
    selectColumnIndices,
    selectColumnStates,
    selectEntities,
    selectFrozenColumns,
    selectIsLoadingEntities,
    selectIsSubmittingValues,
    selectOwnershipChangeColumnIdPersistent,
    selectSelectedColumnHeaderBounds,
    selectShowEntityJustifications,
    selectShowSearch
} from '../selectors'
import { selectUserInfo } from '../../auth/selectors'
import {
    changeColumnIndex,
    clearTable,
    hideHeaderMenu,
    setColumnWidth,
    setLoadDataError,
    showColumnAddMenu,
    showEntityJustificationHistory,
    showHeaderMenu,
    columnChangeOwnershipHide,
    toggleEntityMergingModal,
    toggleSearch
} from '../slice'
import { addError } from '../../util/notification/slice'
import {
    entityChangeOrCreate,
    getColumnAsync,
    getTableAsync,
    submitValuesAsync
} from '../thunks'
import { Column } from '../../column_menu/state'
import {
    ColumnState,
    displayTxtColumnIdx,
    optionalEntityJustificationColumnIdx
} from '../state'
import { Entity } from '../../entity/state'
import {
    ColumnModal,
    EntityAddModal,
    EntityMergingModal,
    EntityJustificationModal,
    DisplayTextDetails
} from './modals'
import { createCellContentCallback } from '../cell'
import { AddEntityButton } from './buttons'
import { SearchButton } from './buttons'
import { DownloadButton } from './buttons'
import { EditSessionEditorButton } from '../../session/components'
import { setShowDetailsForEntityWithIdPersistent } from '../../entity/slice'
import { EntityDetailsModal } from './modals'
import { InfoCircle } from 'react-bootstrap-icons'
import { useColumnDefinitionList } from '../../column_menu/hooks'

export function downloadWorkAround(csvLines: string[]) {
    const blob = new Blob(csvLines, {
        type: 'text/csv;charset=utf-8',
        endings: 'native'
    })
    const element = document.createElement('a')
    const url = window.URL.createObjectURL(blob)
    element.setAttribute('href', url)
    element.setAttribute('download', 'cosmae.csv')

    element.style.display = 'none'
    document.body.appendChild(element)

    element.click()

    document.body.removeChild(element)
    window.URL.revokeObjectURL(url)
}

export function RemoteDataTable() {
    const isLoading = useAppSelector(selectIsLoadingEntities)
    const entities = useAppSelector(selectEntities)
    const userInfo = useAppSelector(selectUserInfo)
    const showJustifications = useAppSelector(selectShowEntityJustifications)
    const columnIndices = useAppSelector(selectColumnIndices)
    const columnStates = useAppSelector(selectColumnStates)
    const columnChangeOwnership = useAppSelector(
        selectOwnershipChangeColumnIdPersistent
    )
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (entities !== undefined || isLoading) {
            return
        }
        if (userInfo === undefined) {
            dispatch(setLoadDataError())
            dispatch(addError('Please refresh the page and log in'))
            return
        }
        dispatch(getTableAsync()).then(async (success) => {
            if (!success) {
                return
            }
            userInfo.value?.columns.forEach(async (col: Column) => {
                const idPersistent = col.idPersistent
                const colStateIdx = columnIndices[idPersistent]
                const colState = columnStates[colStateIdx ?? -1]
                if (
                    isLoading ||
                    colState?.cellContents.isLoading ||
                    colState?.cellContents.value.length > 0
                ) {
                    return
                }
                await dispatch(getColumnAsync(col))
            })
        })
        return () => {
            dispatch(clearTable())
        }
    }, [])

    return (
        <Row className="h-100">
            <Col className="h-100 overflow-hidden d-flex flex-column">
                <Row className="ms-3 me-3 mb-3">
                    <Col className="ps-0">
                        <Row className="justify-content-start">
                            <Col xs="auto">
                                <AddEntityButton dispatch={dispatch} />
                            </Col>
                            <Col className="ps-0" xs="auto">
                                <MergeEntitiesButton
                                    entityIdArray={entities}
                                    mergeRequestCreatedCallback={() =>
                                        dispatch(toggleEntityMergingModal(true))
                                    }
                                />
                            </Col>
                        </Row>
                    </Col>
                    <Col xs="auto" className="pe-0">
                        <EditSessionEditorButton
                            popoverPlacement="bottom"
                            tooltipPlacement="left"
                        />
                    </Col>
                    <Col xs="auto">
                        <SearchButton dispatch={dispatch} />
                    </Col>
                    <Col xs="auto">
                        <DownloadButton
                            entities={entities}
                            columnStates={columnStates}
                            showJustifications={showJustifications}
                        />
                    </Col>
                </Row>
                <Row
                    className="h-100 mb-2 ms-3 me-3"
                    data-testid="table-container-outer"
                >
                    <div
                        className="br-12 ps-0 pe-0 h-100 w-100 overflow-hidden"
                        data-testid="table-container-inner"
                    >
                        <DataTable entities={entities} columnStates={columnStates} />
                        <ColumnModal columnIndices={columnIndices} />
                        <EntityAddModal />
                        <EntityMergingModal />
                        <ChangeOwnershipModal
                            idColumnPersistent={columnChangeOwnership}
                            onClose={() => dispatch(columnChangeOwnershipHide())}
                        />
                        <EntityJustificationModal />
                        <EntityDetailsModal />
                    </div>
                </Row>
                <div id="portal" />
            </Col>
        </Row>
    )
}

const zeroBounds = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    bottom: 0,
    right: 0
}

function columnHeaderBounds(selectedColumnHeaderBounds?: Rectangle) {
    return {
        left: selectedColumnHeaderBounds?.x ?? 0,
        top: selectedColumnHeaderBounds?.y ?? 0,
        width: selectedColumnHeaderBounds?.width ?? 0,
        height: selectedColumnHeaderBounds?.height ?? 0,
        right:
            (selectedColumnHeaderBounds?.x ?? 0) +
            (selectedColumnHeaderBounds?.width ?? 0),
        bottom:
            (selectedColumnHeaderBounds?.y ?? 0) +
            (selectedColumnHeaderBounds?.height ?? 0)
    }
}
export function DataTable({
    entities,
    columnStates
}: {
    entities?: Entity[]
    columnStates: ColumnState[]
}) {
    const dispatch: AppDispatch = useDispatch()
    const tableSelection = useSelector(selectTableSelection)
    const frozenColumns = useAppSelector(selectFrozenColumns),
        columns = useColumnDefinitionList(
            columnStates.map((columnState) => columnState.idColumnPersistent)
        ),
        selectedColumnHeaderBounds = useAppSelector(selectSelectedColumnHeaderBounds),
        isLoading = useAppSelector(selectIsLoadingEntities),
        isSubmittingValues = useAppSelector(selectIsSubmittingValues),
        columnHeaderMenuEntries = useAppSelector(selectColumnHeaderMenu)(dispatch),
        showSearch = useAppSelector(selectShowSearch),
        showEntityJustifications = useAppSelector(selectShowEntityJustifications)
    const cellContentCallback = useCallback(
            createCellContentCallback({
                entities,
                columnStates,
                columns,
                showEntityJustifications: showEntityJustifications
            }),
            [entities, columns, columnStates, showEntityJustifications]
        ),
        submitValueCallback = (cell: Item, newValue: EditableGridCell) => {
            if (entities === undefined || isSubmittingValues) {
                return
            }
            const [colIdx, rowIdx] = cell
            if (
                showEntityJustifications &&
                colIdx == optionalEntityJustificationColumnIdx
            ) {
                return
            }
            if (colIdx == displayTxtColumnIdx) {
                const entity = entities[rowIdx]
                let newValueData: string | undefined = newValue.data?.toString()
                if (newValueData == '') {
                    newValueData = undefined
                }
                dispatch(
                    entityChangeOrCreate({
                        idPersistent: entity.idPersistent,
                        version: entity.version,
                        displayTxt: newValueData
                    })
                )
            } else {
                const column = columns[colIdx]
                if (column === undefined || column.value === undefined) {
                    dispatch(addError('Can not change data for unloaded column.'))
                } else {
                    dispatch(
                        submitValuesAsync(column.value.columnType, [
                            entities[rowIdx].idPersistent,
                            column.value.idPersistent,
                            {
                                ...columnStates[colIdx].cellContents.value[rowIdx][0],
                                value: newValue.data?.toString()
                            }
                        ])
                    )
                }
            }
        },
        showHeaderMenuCallback = (columnIdx: number, bounds: Rectangle) =>
            dispatch(showHeaderMenu({ columnIdx, bounds })),
        hideHeaderMenuCallback = () => dispatch(hideHeaderMenu()),
        setColumnWidthCallback = (
            column: GridColumn,
            newSize: number,
            colIndex: number,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            newSizeWithGrow: number
        ) => dispatch(setColumnWidth({ columnIdx: colIndex, width: newSize })),
        switchColumnsCallback = (startIdx: number, endIdx: number) =>
            dispatch(changeColumnIndex({ startIdx, endIdx })),
        toggleSearchCallback = (show: boolean) => dispatch(toggleSearch(show))
    const headerMenuOpen = selectedColumnHeaderBounds !== undefined
    const { layerProps: columnMenuLayerProps, renderLayer: columnMenuRenderLayer } =
        useLayer({
            isOpen: headerMenuOpen,
            auto: true,
            placement: 'bottom-end',
            onOutsideClick: hideHeaderMenuCallback,
            trigger: {
                getBounds: () => columnHeaderBounds(selectedColumnHeaderBounds)
            }
        })
    const [tooltipEntityDetails, setTooltipEntityDetails] = useState<
        { val: string; bounds: IBounds } | undefined
    >()
    const [tooltipDisplayTextDetails, setTooltipDisplayTextDetails] = useState<
        { val: string; bounds: IBounds } | undefined
    >()
    const { layerProps: tooltipLayerProps, renderLayer: tooltipRenderLayer } = useLayer(
        {
            isOpen: tooltipDisplayTextDetails !== undefined,
            triggerOffset: 4,
            auto: true,
            container: 'portal',
            trigger: {
                getBounds: () => tooltipDisplayTextDetails?.bounds ?? zeroBounds
            }
        }
    )
    const {
        layerProps: entityDetailsLayerProps,
        renderLayer: entityDetailsRenderLayer
    } = useLayer({
        isOpen: tooltipEntityDetails !== undefined,
        auto: true,
        container: 'portal',
        trigger: {
            getBounds: () => tooltipEntityDetails?.bounds ?? zeroBounds
        }
    })
    const onCellActivated = (cell: Item) => {
        const [colIdx, rowIdx] = cell
        if (
            showEntityJustifications &&
            colIdx == optionalEntityJustificationColumnIdx
        ) {
            dispatch(
                showEntityJustificationHistory(
                    entities?.at(rowIdx)?.idPersistent ?? undefined
                )
            )
        }
    }

    const timeoutRefDisplayText = useRef(0)
    const timeoutRefEntityDetails = useRef(0)

    const onItemHovered = useCallback(
        (args: GridMouseEventArgs) => {
            if (
                args.kind === 'cell' &&
                args.location[0] == displayTxtColumnIdx &&
                entities !== undefined
            ) {
                window.clearTimeout(timeoutRefDisplayText.current)
                window.clearTimeout(timeoutRefEntityDetails.current)
                const entity = entities[args.location[1]]
                setTooltipDisplayTextDetails(undefined)
                timeoutRefDisplayText.current = window.setTimeout(() => {
                    setTooltipDisplayTextDetails({
                        val: entity.idPersistent,
                        bounds: {
                            // translate to react-laag types
                            left: args.bounds.x,
                            top: args.bounds.y,
                            width: args.bounds.width,
                            height: args.bounds.height,
                            right: args.bounds.x + args.bounds.width,
                            bottom: args.bounds.y + args.bounds.height
                        }
                    })
                }, 1000)
                timeoutRefEntityDetails.current = window.setTimeout(() => {
                    setTooltipEntityDetails({
                        val: entity.idPersistent,
                        bounds: {
                            // translate to react-laag types
                            left:
                                args.bounds.x + args.bounds.width - args.bounds.height,
                            top: args.bounds.y + args.bounds.height - 5,
                            width: args.bounds.height + 1,
                            height: args.bounds.height + 1,
                            right: args.bounds.x + args.bounds.width + 1,
                            bottom: args.bounds.y + args.bounds.height - 4
                        }
                    })
                }, 200)
            } else {
                window.clearTimeout(timeoutRefDisplayText.current)
                timeoutRefDisplayText.current = 0
                setTooltipDisplayTextDetails(undefined)
                setTooltipEntityDetails(undefined)
            }
        },
        [entities]
    )

    if (isLoading || entities === undefined) {
        return <div className="shimmer"></div>
    } else {
        const columnDefs: GridColumn[] = []
        for (let i = 0; i < columnStates.length; ++i) {
            const columnState = columnStates[i]
            let title = 'loading ...'
            const column = columns[i]
            if (!(column === undefined || column.value === undefined)) {
                title = constructColumnTitle(column.value.namePath)
                if (column.value.curated) {
                    title = '☑ ' + title
                }
            }
            columnDefs.push({
                id: columnState.idColumnPersistent,
                title,
                width: columnState.width,
                hasMenu: i > 1
            })
        }

        return (
            <>
                <DataEditor
                    customRenderers={[loadingCellRenderer]}
                    rows={entities.length}
                    columns={columnDefs}
                    getCellContent={cellContentCallback}
                    width="100%"
                    height="100%"
                    freezeColumns={frozenColumns}
                    rightElement={
                        <ColumnAddButton>
                            <button onClick={() => dispatch(showColumnAddMenu())}>
                                +
                            </button>
                        </ColumnAddButton>
                    }
                    rightElementProps={{
                        fill: false,
                        sticky: true
                    }}
                    onHeaderMenuClick={showHeaderMenuCallback}
                    onColumnResize={setColumnWidthCallback}
                    onColumnMoved={switchColumnsCallback}
                    onCellEdited={submitValueCallback}
                    onCellActivated={onCellActivated}
                    rowMarkers={{ kind: 'checkbox-visible', checkboxStyle: 'circle' }}
                    gridSelection={tableSelection}
                    onGridSelectionChange={mkGridSelectionCallback(dispatch)}
                    onItemHovered={onItemHovered}
                    showSearch={showSearch}
                    onSearchClose={() => toggleSearchCallback(false)}
                    getCellsForSelection={true}
                />
                {headerMenuOpen &&
                    columnMenuRenderLayer(
                        <div {...columnMenuLayerProps}>
                            <HeaderMenu
                                closeHeaderMenuCallback={hideHeaderMenuCallback}
                                menuEntries={columnHeaderMenuEntries}
                            />
                        </div>
                    )}
                {tooltipDisplayTextDetails !== undefined &&
                    tooltipRenderLayer(
                        <div
                            {...tooltipLayerProps}
                            style={{
                                ...tooltipLayerProps.style,
                                padding: '8px 12px',
                                color: 'white',
                                font: '500 13px Inter',
                                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                borderRadius: 9
                            }}
                        >
                            <DisplayTextDetails
                                idEntityPersistent={tooltipDisplayTextDetails.val}
                            />
                        </div>
                    )}
                {tooltipEntityDetails !== undefined &&
                    entityDetailsRenderLayer(
                        <div
                            onClick={() =>
                                dispatch(
                                    setShowDetailsForEntityWithIdPersistent(
                                        tooltipEntityDetails.val
                                    )
                                )
                            }
                            className="fade-in col d-flex flex-column justify-content-center align-items-center rounded-circle align-middle bg-secondary"
                            {...entityDetailsLayerProps}
                            style={{
                                ...entityDetailsLayerProps.style,
                                color: '#197374',
                                font: '500 15px',
                                width: '25px',
                                height: '25px'
                            }}
                            key={tooltipEntityDetails.val}
                            data-testid="details-trigger"
                        >
                            <InfoCircle size="18px" />
                        </div>
                    )}
            </>
        )
    }
}
