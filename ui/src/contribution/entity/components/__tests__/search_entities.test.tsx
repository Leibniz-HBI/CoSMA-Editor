/**
 * @jest-environment jsdom
 */

import { render, RenderOptions, screen, waitFor } from '@testing-library/react'
import {
    EntityDetailsState,
    newEntityDetailsState,
    newEntitySearchResult
} from '../../../../entity/state'
import { EntitySearch } from '../../../../entity/components'
import { entityDetailsReducer } from '../../../../entity/slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import userEvent, { UserEvent } from '@testing-library/user-event'
import {
    newTagDefinition,
    newTagSelectionState,
    TagSelectionState,
    TagType
} from '../../../../column_menu/state'
import { newRemote } from '../../../../util/state'
import { tagSelectionSlice } from '../../../../column_menu/slice'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        entityDetails: EntityDetailsState
        tagSelection: TagSelectionState
    }
}

test('search and click result', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                search_result_list: [
                    newSearchResultApi(resultMatchValue00, resultIdTag00, resultId00),
                    newSearchResultApi(resultMatchValue01, resultIdTag01, resultId01),
                    newSearchResultApi(resultMatchValue02, resultIdTag02, resultId02)
                ]
            }
        ],
        [
            200,
            {
                search_result_list: [
                    newSearchResultApi(resultMatchValue10, resultIdTag10, resultId10),
                    newSearchResultApi(resultMatchValue11, resultIdTag11, resultId11)
                ]
            }
        ]
    ])
    const clickMock = jest.fn()
    const { store } = renderWithProviders(
        <EntitySearch onSearchResultClicked={clickMock} />,
        fetchMock
    )
    const user = userEvent.setup()
    await typeInSearchField(user)
    await waitFor(() => {
        screen.getByText(resultMatchValue00)
        screen.getByText(resultMatchValue01)
        screen.getByText(resultMatchValue02)
    })
    expect(store.getState().entityDetails.entitySearchResults).toEqual(
        newRemote([
            newEntitySearchResult({
                idEntityPersistent: resultId00,
                idTagDefinitionPersistent: resultIdTag00,
                matchValue: resultMatchValue00
            }),
            newEntitySearchResult({
                idEntityPersistent: resultId01,
                idTagDefinitionPersistent: resultIdTag01,
                matchValue: resultMatchValue01
            }),
            newEntitySearchResult({
                idEntityPersistent: resultId02,
                idTagDefinitionPersistent: resultIdTag02,
                matchValue: resultMatchValue02
            })
        ])
    )
    await typeInSearchField(user)
    await waitFor(() => {
        screen.getByText(resultMatchValue10)
        const result = screen.getByText(resultMatchValue11)
        result.click()
    })
    await waitFor(() => {
        expect(clickMock.mock.calls).toEqual([[resultId11]])
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/persons/search?term=f',
            { credentials: 'include' }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/persons/search?term=foofoo',
            { credentials: 'include' }
        ]
    ])
    expect(store.getState().entityDetails.entitySearchResults).toEqual(
        newRemote(undefined)
    )
})

const nameTag0 = 'tag 0'
const nameTag1 = 'tag 1'
const nameTagParent = 'tag parent'
const idTagDef0 = 'id-tag-0'
const idTagDef1 = 'id-tag-1'
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
const resultIdTag00 = undefined
const resultIdTag01 = idTagDef0
const resultIdTag02 = idTagDef1
const resultIdTag10 = undefined
const resultIdTag11 = idTagDef1

const tagCommon = {
    idParentPersistent: undefined,
    columnType: TagType.String,
    owner: undefined,
    curated: false,
    version: 0,
    hidden: false,
    disabled: false
}

async function typeInSearchField(user: UserEvent) {
    await waitFor(() => {
        const input = screen.getByRole('textbox')
        user.type(input, 'foo')
    })
}

function newSearchResultApi(
    matchValue: string,
    idTagDefinitionPersistent: string | undefined,
    idEntityPersistent: string
) {
    return {
        match_value: matchValue,
        id_tag_definition_persistent: idTagDefinitionPersistent,
        id_entity_persistent: idEntityPersistent
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            entityDetails: newEntityDetailsState({}),
            tagSelection: newTagSelectionState({
                tagDefinitionsByIdPersistent: {
                    [idTagDef0]: newRemote(
                        newTagDefinition({
                            ...tagCommon,
                            idPersistent: idTagDef0,
                            namePath: [nameTag0]
                        })
                    ),
                    [idTagDef1]: newRemote(
                        newTagDefinition({
                            ...tagCommon,
                            idPersistent: idTagDef1,
                            namePath: [nameTagParent, nameTag1]
                        })
                    )
                }
            })
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            entityDetails: entityDetailsReducer,
            tagSelection: tagSelectionSlice.reducer
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

function addResponseSequence(mock: jest.Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as jest.Mock
        )
    }
}
