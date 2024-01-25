import { useEffect, useState } from 'react'
import { Col, Form, Row } from 'react-bootstrap'
import { TagDefinition } from '../state'
import { ColumnTypeCreateForm, ColumnTypeCreateFormProps } from './form'
import { ColumnSelector, mkListItems } from './selection'
import { Eye, EyeFill } from 'react-bootstrap-icons'
import { CosmaeLoading } from '../../util/components/misc'
import { useDispatch, useSelector } from 'react-redux'
import { selectNavigationEntries, selectTagSelectionLoading } from '../selectors'
import { toggleExpansion } from '../slice'
import { loadTagDefinitionHierarchy } from '../thunks'
import { AppDispatch } from '../../store'

export function ColumnMenu(props: {
    columnIndices: Map<string, number>
    loadColumnDataCallback: (columnDefinition: TagDefinition) => void
}) {
    const isLoading = useSelector(selectTagSelectionLoading)
    const dispatch: AppDispatch = useDispatch()
    useEffect(
        () => {
            if (!isLoading) {
                dispatch(loadTagDefinitionHierarchy({ expand: true }))
            }
        },
        //eslint-disable-next-line
        [dispatch]
    )
    return (
        <ColumnMenuBody
            columnIndices={props.columnIndices}
            loadColumnDataCallback={props.loadColumnDataCallback}
        />
    )
}

export function ColumnMenuBody(props: {
    columnIndices: Map<string, number>
    loadColumnDataCallback: (columnDefinition: TagDefinition) => void
}) {
    const navigationEntries = useSelector(selectNavigationEntries)
    const isLoading = useSelector(selectTagSelectionLoading)
    const dispatch = useDispatch()
    const toggleExpansionCallback = (path: number[]) => dispatch(toggleExpansion(path))
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
        <div className="container text-left bg-light rounded ps-0 pe-0 h-100 overflow-y-hidden">
            <Col className="h-100 d-flex flex-column overflow-hidden flex-grow-1 flex-shrink-1">
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
                <div className="ps-2 pe-2 d-flex flex-column overflow-hidden flex-grow-1 flex-shrink-1">
                    {isLoading ? (
                        <CosmaeLoading />
                    ) : createTabSelected ? (
                        <ColumnTypeCreateForm>
                            {(columnTypeCreateFormProps: ColumnTypeCreateFormProps) => (
                                <ColumnSelector
                                    listEntries={mkListItems({
                                        columnSelectionEntries: navigationEntries,
                                        path: [],
                                        toggleExpansionCallback:
                                            toggleExpansionCallback,
                                        level: 0,
                                        additionalEntries: additionalEntries,
                                        mkTailElement: (
                                            columnDefinition: TagDefinition
                                        ) => (
                                            <Form.Check
                                                type="radio"
                                                name="parent"
                                                value={columnDefinition.idPersistent}
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
                    ) : (
                        <ColumnSelector
                            listEntries={mkListItems({
                                columnSelectionEntries: navigationEntries,
                                path: [],
                                toggleExpansionCallback: toggleExpansionCallback,
                                level: 0,
                                mkTailElement: (columnDefinition: TagDefinition) => {
                                    const isDisplayedInTable = props.columnIndices.has(
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
                    )}
                </div>
            </Col>
        </div>
    )
}
