import { useDispatch, useSelector } from 'react-redux'
import {
    selectDisplayTxtColumn,
    selectDisplayTxtColumnIdPersistentSet
} from './selectors'
import { Col, ListGroup, Row } from 'react-bootstrap'
import { AppDispatch } from '../../store'
import { CosmaeLoading } from '../../util/components/misc'
import { Column } from '../../column_menu/state'
import { ColumnSelector } from '../../column_menu/components/selection'
import { ColumnNamePath } from '../../column_menu/components/misc'
import { PlusLg, XLg } from 'react-bootstrap-icons'
import { useEffect } from 'react'
import { appendColumnThunk, getDisplayTxtColumns, removeColumnThunk } from './thunks'
import { loadColumnHierarchy } from '../../column_menu/thunks'

export function DisplayTxtManagementComponent() {
    const dispatch: AppDispatch = useDispatch()
    useEffect(
        () => {
            dispatch(getDisplayTxtColumns())
            dispatch(loadColumnHierarchy({ expand: true }))
        },
        []
    )
    return (
        <Row className="h-100 overflow-hidden d-flex flex-row">
            <Col className="pt-2" xs={6}>
                <DisplayTxtOrder />
            </Col>
            <Col xs={6} className="h-100">
                <DisplayTxtAddMenu />
            </Col>
        </Row>
    )
}

function DisplayTxtOrder() {
    const columns = useSelector(selectDisplayTxtColumn)
    const dispatch: AppDispatch = useDispatch()
    const removeColumnCallback = (column: Column) => dispatch(removeColumnThunk(column))
    if (columns.isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ListGroup>
            {columns.value.map((column, idx) => (
                <DisplayTxtOrderItem
                    key={idx}
                    column={column}
                    removeColumnCallback={removeColumnCallback}
                />
            ))}
        </ListGroup>
    )
}

function DisplayTxtOrderItem({
    column,
    removeColumnCallback
}: {
    column: Column
    removeColumnCallback: (column: Column) => void
}) {
    return (
        <ListGroup.Item>
            <Row className="justify-content-between">
                <Col>
                    <ColumnNamePath column={column} />
                </Col>
                <Col
                    xs="auto"
                    className="ms-1 me-1 align-top"
                    onClick={() => removeColumnCallback(column)}
                    role="button"
                >
                    <XLg />
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

function DisplayTxtAddMenu() {
    const dispatch: AppDispatch = useDispatch()
    const alreadyPresentColumnIdPersistentList = useSelector(
        selectDisplayTxtColumnIdPersistentSet
    )
    const appendColumnCallback = (column: Column) => dispatch(appendColumnThunk(column))
    return (
        <ColumnSelector
            mkTailElement={(column) => (
                <DisplayTxtAddTailElement
                    column={column}
                    alreadyPresent={
                        alreadyPresentColumnIdPersistentList[column.idPersistent]
                    }
                    appendColumnCallback={appendColumnCallback}
                />
            )}
        />
    )
}

function DisplayTxtAddTailElement({
    column: column,
    alreadyPresent,
    appendColumnCallback: appendColumnCallback
}: {
    column: Column
    alreadyPresent: boolean
    appendColumnCallback: (column: Column) => void
}) {
    if (!column.curated || alreadyPresent) {
        return <></>
    }
    return (
        <div
            className="ms-1 me-1 align-text-top"
            onClick={() => appendColumnCallback(column)}
        >
            <PlusLg />
        </div>
    )
}
