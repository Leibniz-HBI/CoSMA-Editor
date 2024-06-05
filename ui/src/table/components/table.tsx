import {
    DataEditor,
    EditableGridCell,
    GridColumn,
    GridMouseEventArgs,
    Item,
    Rectangle
} from '@glideapps/glide-data-grid'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Col, Row } from 'react-bootstrap'
import { IBounds, useLayer } from 'react-laag'
import { ColumnAddButton } from '../../column_menu/components/misc'
import { HeaderMenu } from '../../header_menu'
import { drawCell } from '../draw'
import { ChangeOwnershipModal } from '../../tag_management/components'
import { MergeEntitiesButton } from '../selection/components'
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
    selectOwnershipChangeTagDefinition,
    selectSelectedColumnHeaderBounds,
    selectShowSearch
} from '../selectors'
import { selectUserInfo } from '../../user/selectors'
import {
    changeColumnIndex,
    hideHeaderMenu,
    setColumnWidth,
    setLoadDataError,
    showColumnAddMenu,
    showEntityAdd,
    showHeaderMenu,
    tagChangeOwnershipHide,
    tagDefinitionChange,
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
import { TagDefinition } from '../../column_menu/state'
import { ColumnState, Entity, csvLinesFromTable } from '../state'
import { ColumnModal, EntityAddModal, EntityMergingModal } from './modals'
import { createCellContentCallback } from '../cell'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RemoteDataTable() {
    const isLoading = useAppSelector(selectIsLoadingEntities)
    const entities = useAppSelector(selectEntities)
    const userInfo = useAppSelector(selectUserInfo)
    const columnIndices = useAppSelector(selectColumnIndices)
    const columnStates = useAppSelector(selectColumnStates)
    const tagDefinitionChangeOwnership = useAppSelector(
        selectOwnershipChangeTagDefinition
    )
    const dispatch = useAppDispatch()
    useEffect(
        () => {
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
                userInfo?.columns.forEach(async (col: TagDefinition) => {
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
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    return (
        <Row className="h-100">
            <Col className="h-100 overflow-hidden d-flex flex-column">
                <Row className="ms-3 me-3 mb-3">
                    <Col className="ps-0">
                        <Row className="justify-content-start">
                            <Col xs="auto">
                                <Button onClick={() => dispatch(showEntityAdd())}>
                                    Add Entity
                                </Button>
                            </Col>
                            <Col className="ps-0">
                                <MergeEntitiesButton
                                    entityIdArray={entities}
                                    mergeRequestCreatedCallback={() =>
                                        dispatch(toggleEntityMergingModal(true))
                                    }
                                />
                            </Col>
                        </Row>
                    </Col>
                    <Col xs="auto" onClick={() => dispatch(toggleSearch(true))}>
                        <Button>Search</Button>
                    </Col>
                    <Col xs="auto" className="pe-0">
                        <Button
                            onClick={() =>
                                downloadWorkAround(
                                    csvLinesFromTable({ entities, columnStates })
                                )
                            }
                        >
                            Download
                        </Button>
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
                            tagDefinition={tagDefinitionChangeOwnership}
                            onClose={() => dispatch(tagChangeOwnershipHide())}
                            updateTagDefinitionChangeCallback={(tagDefinition) =>
                                dispatch(tagDefinitionChange(tagDefinition))
                            }
                        />
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
        selectedColumnHeaderBounds = useAppSelector(selectSelectedColumnHeaderBounds),
        isLoading = useAppSelector(selectIsLoadingEntities),
        isSubmittingValues = useAppSelector(selectIsSubmittingValues),
        columnHeaderMenuEntries = useAppSelector(selectColumnHeaderMenu)(dispatch),
        showSearch = useAppSelector(selectShowSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const cellContentCallback = useCallback(
            createCellContentCallback({ columnStates }),
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [entities, columnStates]
        ),
        submitValueCallback = (cell: Item, newValue: EditableGridCell) => {
            if (entities === undefined || isSubmittingValues) {
                return
            }
            const [colIdx, rowIdx] = cell
            if (colIdx == 0) {
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
                dispatch(
                    submitValuesAsync(columnStates[colIdx].tagDefinition.columnType, [
                        entities[rowIdx].idPersistent,
                        columnStates[colIdx].tagDefinition.idPersistent,
                        {
                            ...columnStates[colIdx].cellContents.value[rowIdx][0],
                            value: newValue.data?.toString()
                        }
                    ])
                )
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
    const [tooltip, setTooltip] = useState<
        { val: string; bounds: IBounds } | undefined
    >()
    const { layerProps: tooltipLayerProps, renderLayer: tooltipRenderLayer } = useLayer(
        {
            isOpen: tooltip !== undefined,
            triggerOffset: 4,
            auto: true,
            container: 'portal',
            trigger: {
                getBounds: () => tooltip?.bounds ?? zeroBounds
            }
        }
    )

    const timeoutRef = useRef(0)

    const onItemHovered = useCallback(
        (args: GridMouseEventArgs) => {
            if (
                args.kind === 'cell' &&
                args.location[0] == 0 &&
                entities !== undefined
            ) {
                window.clearTimeout(timeoutRef.current)
                setTooltip(undefined)
                let tooltipValue = ''
                const displayTxtDetails = entities[args.location[1]].displayTxtDetails
                if (displayTxtDetails === undefined) {
                    tooltipValue = 'Unknown display txt source'
                } else if (typeof displayTxtDetails == 'string') {
                    tooltipValue = displayTxtDetails
                } else {
                    tooltipValue = constructColumnTitle(displayTxtDetails.namePath)
                }
                timeoutRef.current = window.setTimeout(() => {
                    setTooltip({
                        val: `Display text source: ${tooltipValue}`,
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
            } else {
                window.clearTimeout(timeoutRef.current)
                timeoutRef.current = 0
                setTooltip(undefined)
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
            let title = constructColumnTitle(columnState.tagDefinition.namePath)
            if (columnState.tagDefinition.curated) {
                title = '☑ ' + title
            }
            columnDefs.push({
                id: columnState.tagDefinition.idPersistent,
                title,
                width: columnState.width,
                hasMenu: i >= frozenColumns
            })
        }

        return (
            <>
                <DataEditor
                    drawCell={drawCell}
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
                    rowMarkers="checkbox-visible"
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
                {tooltip != undefined &&
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
                            {tooltip.val}
                        </div>
                    )}
            </>
        )
    }
}
