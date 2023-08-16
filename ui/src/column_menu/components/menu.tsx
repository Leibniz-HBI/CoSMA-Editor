import { useState } from 'react'
import { Col, Form, Row } from 'react-bootstrap'
import { ColumnDefinition } from '../state'
import { ColumnTypeCreateForm, ColumnTypeCreateFormProps } from './form'
import { ColumnSelector, mkListItems } from './selection'
import { Eye, EyeFill } from 'react-bootstrap-icons'
import { ColumnHierarchyContext } from '../hooks'
import { CosmaeLoading } from '../../util/components/misc'
import { ColumnMenuProvider } from './provider'

export function ColumnMenu(props: {
    columnIndices: Map<string, number>
    loadColumnDataCallback: (columnDefinition: ColumnDefinition) => void
}) {
    return (
        <ColumnMenuProvider>
            <ColumnMenuBody
                columnIndices={props.columnIndices}
                loadColumnDataCallback={props.loadColumnDataCallback}
            />
        </ColumnMenuProvider>
    )
}

export function ColumnMenuBody(props: {
    columnIndices: Map<string, number>
    loadColumnDataCallback: (columnDefinition: ColumnDefinition) => void
}) {
    let showLinkClass = 'nav-link'
    let createLinkClass = 'nav-link'
    const additionalEntries = [{ idPersistent: '', name: 'No parent' }]
    const [createTabSelected, setCreateTabSelected] = useState(false)
    if (createTabSelected) {
        createLinkClass += ' active bg-light'
    } else {
        showLinkClass += ' active bg-light'
    }
    return (
        <div className="container text-left bg-light rounded ps-0 pe-0">
            <Col>
                <Row className="ms-0 me-0">
                    <ul className="nav nav-tabs justify-content-center ">
                        <li
                            className="nav-item "
                            onClick={() => setCreateTabSelected(false)}
                        >
                            <a className={showLinkClass}>Load</a>
                        </li>
                        <li
                            className="nav-item "
                            onClick={() => setCreateTabSelected(true)}
                        >
                            <a className={createLinkClass}>Create</a>
                        </li>
                    </ul>
                </Row>
                <Row className="ps-2 pe-2">
                    <ColumnHierarchyContext.Consumer>
                        {(remoteColumnMenuData) => {
                            if (remoteColumnMenuData === undefined) {
                                return <CosmaeLoading />
                            }
                            if (createTabSelected) {
                                return (
                                    <ColumnTypeCreateForm
                                        submitColumnDefinitionCallback={
                                            remoteColumnMenuData.submitColumnDefinitionCallback
                                        }
                                        submitError={
                                            remoteColumnMenuData.submitColumnError
                                        }
                                        clearError={
                                            remoteColumnMenuData.submitColumnDefinitionClearErrorCallback
                                        }
                                    >
                                        {(
                                            columnTypeCreateFormProps: ColumnTypeCreateFormProps
                                        ) => (
                                            <ColumnSelector
                                                listEntries={mkListItems({
                                                    columnSelectionEntries:
                                                        remoteColumnMenuData.navigationEntries,
                                                    path: [],
                                                    toggleExpansionCallback:
                                                        remoteColumnMenuData.toggleExpansionCallback,
                                                    level: 0,
                                                    additionalEntries:
                                                        additionalEntries,
                                                    mkTailElement: (
                                                        columnDefinition: ColumnDefinition
                                                    ) => (
                                                        <Form.Check
                                                            type="radio"
                                                            name="parent"
                                                            value={
                                                                columnDefinition.idPersistent
                                                            }
                                                            onChange={
                                                                columnTypeCreateFormProps.handleChange
                                                            }
                                                            checked={
                                                                columnTypeCreateFormProps.selectedParent ==
                                                                columnDefinition.idPersistent
                                                            }
                                                        />
                                                    )
                                                })}
                                            />
                                        )}
                                    </ColumnTypeCreateForm>
                                )
                            }

                            return (
                                <ColumnSelector
                                    listEntries={mkListItems({
                                        columnSelectionEntries:
                                            remoteColumnMenuData.navigationEntries,
                                        path: [],
                                        toggleExpansionCallback:
                                            remoteColumnMenuData.toggleExpansionCallback,
                                        level: 0,
                                        mkTailElement: (
                                            columnDefinition: ColumnDefinition
                                        ) => {
                                            const isDisplayedInTable =
                                                props.columnIndices.has(
                                                    columnDefinition.idPersistent
                                                )
                                            if (isDisplayedInTable) {
                                                return (
                                                    <span className="icon">
                                                        <EyeFill height={20} />
                                                    </span>
                                                )
                                            } else {
                                                return (
                                                    <span
                                                        className="icon"
                                                        onClick={() =>
                                                            props.loadColumnDataCallback(
                                                                columnDefinition
                                                            )
                                                        }
                                                    >
                                                        <Eye height={20} />
                                                    </span>
                                                )
                                            }
                                        }
                                    })}
                                />
                            )
                        }}
                    </ColumnHierarchyContext.Consumer>
                </Row>
            </Col>
        </div>
    )
}
