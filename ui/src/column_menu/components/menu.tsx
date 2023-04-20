import { useLayoutEffect } from 'react'
import { Col, Row } from 'react-bootstrap'
import { ColumnMenuTab } from '../actions'
import { useRemoteColumnMenuData } from '../hooks'
import { ColumnDefinition } from '../state'
import { ColumnTypeCreateForm, ColumnTypeCreateFormProps } from './form'
import { ColumnSelector, mkListItems } from './selection'

export function ColumnMenu(props: {
    columnIndices: Map<string, number>
    loadColumnDataCallback: (columnDefinition: ColumnDefinition) => void
}) {
    const {
        selectedTab,
        navigationEntries: columnSelectionEntries,
        submitColumnError,
        toggleExpansionCallback,
        getHierarchyCallback,
        selectTabCallback,
        submitColumnDefinitionCallback,
        submitColumnDefinitionClearErrorCallback
    } = useRemoteColumnMenuData()
    useLayoutEffect(
        () => {
            getHierarchyCallback()
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )
    let showLinkClass = 'nav-link'
    let createLinkClass = 'nav-link'
    let level = 0
    if (selectedTab === ColumnMenuTab.CREATE_NEW) {
        createLinkClass += ' active bg-light'
        level = -1
    } else {
        showLinkClass += ' active bg-light'
    }
    const listEntries = mkListItems({
        columnSelectionEntries: columnSelectionEntries,
        path: [],
        columnIndices: props.columnIndices,
        loadColumnDataCallback: props.loadColumnDataCallback,
        toggleExpansionCallback: toggleExpansionCallback,
        level: level
    })
    return (
        <div
            className="container text-left bg-light rounded vh-80 ps-0 pe-0"
            style={{ width: '400px' }}
        >
            <Col>
                <Row className="ms-0 me-0">
                    <ul className="nav nav-tabs justify-content-center ">
                        <li
                            className="nav-item "
                            onClick={() => selectTabCallback(ColumnMenuTab.SHOW)}
                        >
                            <a className={showLinkClass}>Load</a>
                        </li>
                        <li
                            className="nav-item "
                            onClick={() => selectTabCallback(ColumnMenuTab.CREATE_NEW)}
                        >
                            <a className={createLinkClass}>Create</a>
                        </li>
                    </ul>
                </Row>
                <Row className="ps-2 pe-2">
                    {selectedTab === ColumnMenuTab.CREATE_NEW ? (
                        <ColumnTypeCreateForm
                            submitColumnDefinitionCallback={
                                submitColumnDefinitionCallback
                            }
                            submitError={submitColumnError}
                            clearError={submitColumnDefinitionClearErrorCallback}
                        >
                            {(
                                columnTypeCreateFormProps?: ColumnTypeCreateFormProps
                            ) => (
                                <ColumnSelector
                                    listEntryBuilderList={listEntries}
                                    columnTypeCreateFormProps={
                                        columnTypeCreateFormProps
                                    }
                                />
                            )}
                        </ColumnTypeCreateForm>
                    ) : (
                        <ColumnSelector listEntryBuilderList={listEntries} />
                    )}
                </Row>
            </Col>
        </div>
    )
}
