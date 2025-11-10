/**
 * @vitest-environment jsdom
 */

import { vi, Mock } from 'vitest'
import { render, RenderOptions, screen, waitFor} from '@testing-library/react'
import {
    EntityDetailsState,
    newEntity,
    newEntityDetailsState,
    newEntitySearchResult
} from '../state'
import { EntitySearch } from '../components'
import { entityDetailsReducer } from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { act, PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import userEvent, { UserEvent } from '@testing-library/user-event'
import {
    newColumn,
    newColumnSelectionState,
    ColumnSelectionState,
    ColumnType
} from '../../column_menu/state'
import { newRemote } from '../../util/state'
import { columnSelectionReducer} from '../../column_menu/slice'
import { newTableState, TableState } from '../../table/state'
import { tableReducer } from '../../table/slice'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        entityDetails: EntityDetailsState
        columnSelection: ColumnSelectionState
        table: TableState
    }
}

test('search and click result', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                search_result_list: [
                    newSearchResultApi(resultMatchValue00, resultIdColumn00, resultId00),
                    newSearchResultApi(resultMatchValue01, resultIdColumn01, resultId01),
                    newSearchResultApi(resultMatchValue02, resultIdColumn02, resultId02)
                ]
            }
        ],
        [
            200,
            {
                search_result_list: [
                    newSearchResultApi(resultMatchValue10, resultIdColumn10, resultId10),
                    newSearchResultApi(resultMatchValue11, resultIdColumn11, resultId11)
                ]
            }
        ]
    ])
    const clickMock = vi.fn()
    const { store } = renderWithProviders(
        <EntitySearch onSearchResultClicked={clickMock} />,
        fetchMock
    )
    const user = userEvent.setup()
    await typeInSearchField(user)
    await waitFor(() => {
        screen.getByText(displayTxt00)
        screen.getByText(displayTxt01)
        screen.getByText(displayTxt02)
    })
    expect(store.getState().entityDetails.entitySearchResults).toEqual(
        newRemote([
            newEntitySearchResult({
                idEntityPersistent: resultId00,
                idColumnPersistent: resultIdColumn00,
                matchValue: resultMatchValue00
            }),
            newEntitySearchResult({
                idEntityPersistent: resultId01,
                idColumnPersistent: resultIdColumn01,
                matchValue: resultMatchValue01
            }),
            newEntitySearchResult({
                idEntityPersistent: resultId02,
                idColumnPersistent: resultIdColumn02,
                matchValue: resultMatchValue02
            })
        ])
    )
    await typeInSearchField(user)
    await waitFor(() => {
        screen.getByText(displayTxt10)
        const result = screen.getByText(displayTxt11)
        result.click()
    })
    await waitFor(() => {
        expect(clickMock.mock.calls).toEqual([[resultId11]])
    })
    expect(fetchMock.mock.calls).toEqual([
        ['http://127.0.0.1:8000/cosmae/api/entities/search?term=f', { credentials: 'include' }],
        ['http://127.0.0.1:8000/cosmae/api/entities/search?term=ff', { credentials: 'include' }]
    ])
    expect(store.getState().entityDetails.entitySearchResults).toEqual(
        newRemote(undefined)
    )
})

const nameColumn0 = 'column 0'
const nameColumn1 = 'column 1'
const nameColumnParent = 'column parent'
const idColumn0 = 'id-column-0'
const idColumn1 = 'id-column-1'
const resultId00 = 'id-result-0-0'
const resultId01 = 'id-result-0-1'
const resultId02 = 'id-result-0-2'
const resultId10 = 'id-result-1-0'
const resultId11 = 'id-result-1-1'
const resultMatchValue00 = 'match 0 0'
const resultMatchValue01 = 'match 0 1'
const resultMatchValue02 = 'match 0 2'
const resultMatchValue10 = 'match 1 0'
const resultMatchValue11 = 'match 1 1'
const resultIdColumn00 = undefined
const resultIdColumn01 = idColumn0
const resultIdColumn02 = idColumn1
const resultIdColumn10 = undefined
const resultIdColumn11 = idColumn1
const displayTxt00 = 'Entity 00'
const displayTxt01 = 'Entity 01'
const displayTxt02 = 'Entity 02'
const displayTxt10 = 'Entity 10'
const displayTxt11 = 'Entity 11'

const columnCommon = {
    idParentPersistent: undefined,
    columnType: ColumnType.String,
    owner: undefined,
    curated: false,
    version: 0,
    hidden: false,
    disabled: false
}

async function typeInSearchField(user: UserEvent) {
    await waitFor(async () => {
        const input = screen.getByRole('textbox')
        await act(async () => await user.type(input, 'f'))
    }, { timeout: 5000 })
}

function newSearchResultApi(
    matchValue: string,
    idColumnPersistent: string | undefined,
    idEntityPersistent: string
) {
    return {
        match_value: matchValue,
        id_column_persistent: idColumnPersistent,
        id_entity_persistent: idEntityPersistent
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            entityDetails: newEntityDetailsState({
                entityByIdPersistentMap: {
                    [resultId00]: newRemote(
                        newEntity({
                            idPersistent: resultId00,
                            displayTxt: displayTxt00,
                            version: 100,
                            disabled: false
                        })
                    ),
                    [resultId01]: newRemote(
                        newEntity({
                            idPersistent: resultId01,
                            displayTxt: displayTxt01,
                            version: 101,
                            disabled: false
                        })
                    ),
                    [resultId02]: newRemote(
                        newEntity({
                            idPersistent: resultId02,
                            displayTxt: displayTxt02,
                            version: 102,
                            disabled: false
                        })
                    ),
                    [resultId10]: newRemote(
                        newEntity({
                            idPersistent: resultId10,
                            displayTxt: displayTxt10,
                            version: 10,
                            disabled: false
                        })
                    ),
                    [resultId11]: newRemote(
                        newEntity({
                            idPersistent: resultId11,
                            displayTxt: displayTxt11,
                            version: 111,
                            disabled: false
                        })
                    )
                }
            }),
            columnSelection: newColumnSelectionState({
                columnsByIdPersistent: {
                    [idColumn0]: newRemote(
                        newColumn({
                            ...columnCommon,
                            idPersistent: idColumn0,
                            namePath: [nameColumn0]
                        })
                    ),
                    [idColumn1]: newRemote(
                        newColumn({
                            ...columnCommon,
                            idPersistent: idColumn1,
                            namePath: [nameColumnParent, nameColumn1]
                        })
                    )
                }
            }),
            table: newTableState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            entityDetails: entityDetailsReducer,
            columnSelection: columnSelectionReducer,
            table: tableReducer
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ thunk: { extraArgument: fetchMock } }),
        preloadedState
    })
    function Wrapper({ children }: PropsWithChildren<object>): JSX.Element {
        return <Provider store={store}>{children}</Provider>
    }

    // Return an object with the store and all of RTL's query functions
    return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}

function addResponseSequence(mock: Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            vi.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as Mock
        )
    }
}
