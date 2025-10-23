import {
    ChangeEvent,
    createContext,
    ReactElement,
    ReactNode,
    useContext,
    useEffect,
    useReducer,
    useState
} from 'react'
import { FormField } from '../../util/form'
import { useAppDispatch } from '../../hooks'
import { debounce } from 'debounce'
import { Col, ListGroup, ProgressBar, Row } from 'react-bootstrap'
import { ColumnNamePath } from './misc'
import { useColumn } from '../hooks'
import { Column } from '../state'
import { newRemote, RemoteInterface } from '../../util/state'
import { cosmaeColumnApiGetSearch } from '../../openapi/cosmae'
import { addError } from '../../util/notification/slice'
import { errorMessageFromApi } from '../../util/exception'

export const ColumnSearchContext = createContext<RemoteInterface<string[] | undefined>>(
    newRemote(undefined)
)
export const ColumnSearchDispatchContext = createContext<{
    search: (term: string, upUntilDate?: Date) => void
    clearSearch: VoidFunction
}>({ search: (_term: string, _upUntilDate?: Date) => {}, clearSearch: () => {} })

export function columnSearchReducer(
    state: RemoteInterface<string[] | undefined>,
    action: { type: string; payload?: string[] }
) {
    switch (action.type) {
        case 'column_search_start':
            return newRemote(state.value, true)
        case 'column_search_end':
            return newRemote(state.value, false)
        case 'column_search_success':
            return newRemote(action.payload, false)
        case 'column_search_clear':
            return newRemote(undefined, false)
        default:
            return state
    }
}

const debounceSearchThunk = (
    searchThunk: (term: string, upUntilDate: Date | undefined) => Promise<void>,
    clearSearch: VoidFunction
) =>
    debounce((term: string, upUntilDate: Date | undefined) => {
        if (term.length > 0) {
            searchThunk(term, upUntilDate)
        } else {
            clearSearch()
        }
    }, 400)

export function ColumnSearchProvider({ children }: { children: ReactNode }) {
    const appDispatch = useAppDispatch()
    const [state, dispatch] = useReducer(columnSearchReducer, newRemote(undefined))
    useEffect(() => {
        return () => {
            clearSearch()
        }
    }, [dispatch])
    function clearSearch() {
        dispatch({ type: 'column_search_clear' })
    }
    async function searchThunk(
        term: string,
        upUntilDate: Date | undefined = undefined
    ) {
        dispatch({ type: 'column_search_start' })
        const rsp = await cosmaeColumnApiGetSearch({
            query: { term, up_until_time: upUntilDate?.toISOString() }
        })
        if (rsp.data !== undefined) {
            dispatch({
                type: 'column_search_success',
                payload: rsp.data.id_persistent_list
            })
        } else {
            dispatch({ type: 'column_search_end' })
            appDispatch(addError(errorMessageFromApi(rsp.error)))
        }
    }
    const debouncedSearchThunk = debounceSearchThunk(searchThunk, clearSearch)
    return (
        <ColumnSearchContext.Provider value={state}>
            <ColumnSearchDispatchContext.Provider
                value={{
                    search: debouncedSearchThunk,
                    clearSearch
                }}
            >
                {children}
            </ColumnSearchDispatchContext.Provider>
        </ColumnSearchContext.Provider>
    )
}

export function ColumnSearchField({
    upUntilDate = undefined
}: {
    upUntilDate: Date | undefined
}) {
    const searchDispatchContext = useContext(ColumnSearchDispatchContext)
    const [searchTerm, setSearchTerm] = useState('')
    return (
        <FormField
            label="Search"
            name="Search"
            handleChange={(e: ChangeEvent<HTMLInputElement>) => {
                const formValue = e.target.value
                setSearchTerm(formValue)
                searchDispatchContext.search(formValue, upUntilDate)
            }}
            value={searchTerm}
        />
    )
}

export function ColumnExplorerSearchResults({
    mkTailElement,
    upUntilDate = undefined
}: {
    mkTailElement: (def: Column) => ReactElement
    upUntilDate: Date | undefined
}) {
    const searchResultIdPersistentList = useContext(ColumnSearchContext)
    if (searchResultIdPersistentList.value?.length == 0) {
        return <div>No results found</div>
    }
    return (
        <ListGroup>
            {searchResultIdPersistentList.value?.map((id) => (
                <ListGroup.Item key={id}>
                    <ColumnExplorerSearchResultItem
                        idColumnPersistent={id}
                        upUntilTime={upUntilDate}
                        mkTailElement={mkTailElement}
                    />
                </ListGroup.Item>
            ))}
        </ListGroup>
    )
}
export function ColumnExplorerSearchResultItem({
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
