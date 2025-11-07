import {
    ChangeEvent,
    createContext,
    forwardRef,
    ReactElement,
    ReactNode,
    useContext,
    useEffect,
    useReducer,
    useRef,
    useState,
    MutableRefObject
} from 'react'
import { FormField } from '../../util/form'
import { useAppDispatch } from '../../hooks'
import { debounce } from 'debounce'
import { Col, ListGroup, Overlay, ProgressBar, Row } from 'react-bootstrap'
import { ColumnNamePath, ColumnNamePathFromId } from './misc'
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

export const ColumnSearchField = forwardRef(
    ({ upUntilDate = undefined }: { upUntilDate: Date | undefined }, ref) => {
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
                ref={ref}
            />
        )
    }
)

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

export function ColumnSearch({
    onSearchResultClicked,
    upUntilDate = undefined,
    resultsClassName = ''
}: {
    onSearchResultClicked: (idColumnPersistent: string) => void
    upUntilDate?: Date | undefined
    resultsClassName?: string
}) {
    const target = useRef(null)
    return (
        <ColumnSearchProvider>
            <ColumnSearchField upUntilDate={upUntilDate} ref={target} />
            <ColumnSearchResults
                onSearchResultClicked={onSearchResultClicked}
                resultsClassName={resultsClassName}
                target={target}
            />
        </ColumnSearchProvider>
    )
}

export function ColumnSearchResults({
    onSearchResultClicked,
    resultsClassName = '',
    target
}: {
    onSearchResultClicked: (idColumnPersistent: string) => void
    resultsClassName?: string
    target: MutableRefObject<null>
}) {
    const searchResultIdPersistentList = useContext(ColumnSearchContext)
    return (
        <Overlay
            target={target}
            show={searchResultIdPersistentList.value !== undefined}
            placement="bottom-start"
        >
            {({
                placement: _placement,
                arrowProps: _arrowProps,
                show: _show,
                popper: _popper,
                hasDoneInitialMeasure: _hasDoneInitialMeasure,
                ...props
            }) => {
                return (
                    <Row
                        className="z-3000"
                        {...props}
                        style={{
                            position: 'relative',
                            paddingTop: '4px',
                            paddingLeft: '12px',
                            ...props.style
                        }}
                    >
                        <div className={resultsClassName}>
                            <div className="h-100 overflow-y-scroll scroll-gutter">
                                <ColumnSearchResultList
                                    onSearchResultClicked={onSearchResultClicked}
                                />
                            </div>
                        </div>
                    </Row>
                )
            }}
        </Overlay>
    )
}

export function ColumnSearchResultList({
    onSearchResultClicked
}: {
    onSearchResultClicked: (idColumnPersistent: string) => void
}) {
    const searchResultIdPersistentList = useContext(ColumnSearchContext)
    let items = [<ListGroup.Item>No columns found</ListGroup.Item>]
    if (searchResultIdPersistentList.value?.length !== 0) {
        items = searchResultIdPersistentList.value?.map((idColumnPersistent, idx) => (
            <ListGroup.Item
                role="button"
                key={idx}
                onClick={() => onSearchResultClicked(idColumnPersistent)}
            >
                <ColumnNamePathFromId idColumnPersistent={idColumnPersistent} />
            </ListGroup.Item>
        )) ?? [<ListGroup.Item key={-1} />]
    }
    return <ListGroup>{items}</ListGroup>
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
