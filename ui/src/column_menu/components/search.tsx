import { ChangeEvent, ReactElement, useEffect, useState } from 'react'
import { FormField } from '../../util/form'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { AppDispatch } from '../../store'
import { debounce } from 'debounce'
import { searchColumnClear } from '../slice'
import { selectSearchResultIdPersistentList } from '../selectors'
import { Col, ListGroup, ProgressBar, Row } from 'react-bootstrap'
import { ColumnNamePath } from './misc'
import { searchColumnThunk } from '../thunks'
import { useColumn } from '../hooks'
import { Column } from '../state'

const debouncedSearchDispatch = debounce(
    (searchTerm: string, upUntilDate: Date | undefined, dispatch: AppDispatch) => {
        if (searchTerm.length > 0) {
            dispatch(searchColumnThunk(searchTerm, upUntilDate))
        } else {
            dispatch(searchColumnClear())
        }
    },
    400
)

const debouncedSearchDispatchThunk =
    (searchTerm: string, upUntilDate: Date | undefined) => (dispatch: AppDispatch) =>
        debouncedSearchDispatch(searchTerm, upUntilDate, dispatch)

export function ColumnSearchField({
    upUntilDate = undefined
}: {
    upUntilDate: Date | undefined
}) {
    const dispatch = useAppDispatch()
    const [searchTerm, setSearchTerm] = useState('')
    useEffect(() => {
        return () => {
            dispatch(searchColumnClear())
        }
    }, [dispatch])
    return (
        <FormField
            label="Search"
            name="Search"
            handleChange={(e: ChangeEvent<HTMLInputElement>) => {
                const formValue = e.target.value
                setSearchTerm(formValue)
                dispatch(debouncedSearchDispatchThunk(formValue, upUntilDate))
            }}
            value={searchTerm}
        />
    )
}

export function ColumnSearchResults({
    mkTailElement,
    upUntilDate = undefined
}: {
    mkTailElement: (def: Column) => ReactElement
    upUntilDate: Date | undefined
}) {
    const searchResultIdPersistentList = useAppSelector(
        selectSearchResultIdPersistentList
    )
    if (searchResultIdPersistentList.value?.length == 0) {
        return <div>No results found</div>
    }
    return (
        <ListGroup>
            {searchResultIdPersistentList.value?.map((id) => (
                <ListGroup.Item key={id}>
                    <ColumnSearchResultItem
                        idColumnPersistent={id}
                        upUntilTime={upUntilDate}
                        mkTailElement={mkTailElement}
                    />
                </ListGroup.Item>
            ))}
        </ListGroup>
    )
}
export function ColumnSearchResultItem({
    idColumnPersistent,
    upUntilTime,
    mkTailElement
}: {
    idColumnPersistent: string
    upUntilTime: Date | undefined
    mkTailElement: (def: Column) => ReactElement
}) {
    const column = useColumn(idColumnPersistent, upUntilTime)
    if (column.isLoading) {
        return <ProgressBar animated={true} />
    }
    if (column.value === undefined) {
        return <span></span>
    }
    return (
        <Row className="justify-content-between">
            <Col>
                <ColumnNamePath column={column.value} />
            </Col>
            <Col xs="auto">{mkTailElement(column.value)}</Col>
        </Row>
    )
}
