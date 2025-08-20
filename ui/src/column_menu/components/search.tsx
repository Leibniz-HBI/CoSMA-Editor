import { ChangeEvent, useEffect, useState } from 'react'
import { FormField } from '../../util/form'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { AppDispatch } from '../../store'
import { debounce } from 'debounce'
import { searchColumnClear } from '../slice'
import { selectSearchResultIdPersistentList } from '../selectors'
import { ListGroup } from 'react-bootstrap'
import { ColumnNamePathFromId } from './misc'
import { searchColumnThunk } from '../thunks'

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
    upUntilDate = undefined
}: {
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
                    <ColumnNamePathFromId
                        idColumnPersistent={id}
                        upUntilTime={upUntilDate}
                    />
                </ListGroup.Item>
            ))}
        </ListGroup>
    )
}
