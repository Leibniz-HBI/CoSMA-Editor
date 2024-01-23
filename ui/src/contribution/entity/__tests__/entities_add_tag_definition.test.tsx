/**
 * @jest-environment jsdom
 */
jest.mock('@glideapps/glide-data-grid', () => ({
    __esmodule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    DataEditor: jest.fn().mockImplementation((props: any) => <MockTable />)
}))
import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import {
    ContributionEntityState,
    newContributionEntityState,
    newScoredEntity
} from '../state'
import { RemoteInterface, newRemote } from '../../../util/state'
import { Contribution } from '../../state'
import { configureStore } from '@reduxjs/toolkit'
import { contributionEntitySlice } from '../slice'
import { contributionSlice } from '../../slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { EntitiesStep } from '../components'
import { TagSelectionState, newTagSelectionState } from '../../../column_menu/state'
import { tagSelectionSlice } from '../../../column_menu/slice'

jest.mock('react-router-dom', () => {
    const loaderMock = jest.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    return { useLoaderData: loaderMock, useNavigate: jest.fn() }
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    return <div className="mock"></div>
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contributionEntity: ContributionEntityState
        contribution: {
            selectedContribution: RemoteInterface<Contribution | undefined>
        }
        tagSelection: TagSelectionState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            contributionEntity: newContributionEntityState({}),
            contribution: { selectedContribution: newRemote(undefined) },
            tagSelection: newTagSelectionState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contributionEntity: contributionEntitySlice.reducer,
            contribution: contributionSlice.reducer,
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
const idContribution = 'id-contribution-test'
const contributionTest = {
    id_persistent: idContribution,
    name: 'contribution test',
    description: 'A contribution used in tests',
    has_header: true,
    state: 'VALUES_EXTRACTED',
    author: 'author-test'
}
const personList = Array.from({ length: 60 }, (_val, idx) => {
    return {
        display_txt: `entity-${idx}`,
        display_txt_details: 'display_txt_detail',
        version: 0,
        id_persistent: `id-entity-${idx}`
    }
})
function mkMatches(
    entities: {
        id_persistent: string
        display_txt: string
        version: number
    }[]
) {
    return Object.fromEntries(
        entities.map((entity, idx) => [
            entity.id_persistent,
            {
                matches: [
                    {
                        similarity: idx / 100.0,
                        id_match_tag_definition_persistent_list: [],
                        entity: {
                            display_txt: entity.display_txt + ` match 0`,
                            display_txt_details: 'display_txt_detail',
                            id_persistent: entity.id_persistent + '-0',
                            version: 0
                        }
                    },
                    {
                        similarity: idx / 100.0 + 0.001,
                        id_match_tag_definition_persistent_list: [],
                        entity: {
                            display_txt: entity.display_txt + ` match 1`,
                            display_txt_details: 'display_txt_detail',
                            id_persistent: entity.id_persistent + '-1',
                            version: 0
                        }
                    }
                ],
                assignedDuplicate:
                    idx % 10 == 0
                        ? {
                              display_txt: entity.display_txt + ' match 1',
                              display_txt_details: 'display_txt_detail',
                              id_persistent: entity.id_persistent + '-1',
                              version: 0
                          }
                        : undefined
            }
        ])
    )
}
const idTagDef0 = 'id-tag-test-0'
const nameTagDef0 = 'tag def 0'
const idTagDefContribution = 'id-tag-def-contribution'
function initialResponses(fetchMock: jest.Mock) {
    addResponseSequence(fetchMock, [
        [200, { contributionTest }],
        [200, { persons: personList }],
        [200, { persons: [] }],
        [
            200,
            {
                tag_definitions: [
                    {
                        id_persistent: idTagDef0,
                        name_path: [nameTagDef0],
                        name: nameTagDef0,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { tag_definitions: [] }],
        [200, { matches: mkMatches(personList.slice(0, 50)) }],
        [200, { matches: mkMatches(personList.slice(50)) }]
    ])
}

test('add tag', async () => {
    const fetchMock = jest.fn()
    initialResponses(fetchMock)
    addResponseSequence(fetchMock, [
        [
            200,
            {
                value_responses: personList.slice(0, 50).flatMap((entity, idx) => [
                    {
                        id_entity_persistent: entity.id_persistent,
                        id_tag_definition: idTagDefContribution,
                        id_tag_definition_requested_persistent: idTagDef0,
                        is_existing: false,
                        version: idx,
                        value: 'val-' + idx,
                        id_persistent: 'id-val-' + idx
                    },
                    {
                        id_entity_persistent: entity.id_persistent + '-0',
                        id_tag_definition_requested_persistent: idTagDef0,
                        id_tag_definition: idTagDef0,
                        is_existing: true,
                        version: idx,
                        value: 'val-0-' + idx,
                        id_persistent: 'id-val-0-' + idx
                    },
                    {
                        id_entity_persistent: entity.id_persistent + '-1',
                        id_tag_definition: idTagDef0,
                        id_tag_definition_requested_persistent: idTagDef0,
                        is_existing: true,
                        version: idx,
                        value: 'val-1-' + idx,
                        id_persistent: 'id-val-1-' + idx
                    }
                ])
            }
        ],
        [200, { value_responses: [] }]
    ])
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(7)
    })
    const additionalTagButtons = screen.getByRole('button', {
        name: /show additional tag values/i
    })
    additionalTagButtons.click()
    let tagDefLabel: HTMLElement | undefined
    await waitFor(() => {
        tagDefLabel = screen.getByText(nameTagDef0)
    })
    const tagListItem =
        tagDefLabel?.parentElement?.parentElement?.parentElement?.parentElement
    const tagButton = tagListItem?.children[1]
    expect(tagButton?.className).toEqual('icon')
    ;(tagButton as HTMLElement)?.click()

    screen.getByRole('button', { name: /close/i }).click()
    expect(fetchMock.mock.calls.at(-2)).toEqual([
        'http://127.0.0.1:8000/cosmae/api/tags/entities',
        {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                id_tag_definition_persistent_list: [idTagDef0],
                id_entity_persistent_list: personList
                    .slice(0, 50)
                    .flatMap((entity) => [
                        entity.id_persistent,
                        entity.id_persistent + '-0',
                        entity.id_persistent + '-1'
                    ]),
                id_contribution_persistent: idContribution
            })
        }
    ])
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        'http://127.0.0.1:8000/cosmae/api/tags/entities',
        {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                id_tag_definition_persistent_list: [idTagDef0],
                id_entity_persistent_list: personList
                    .slice(50)
                    .flatMap((entity) => [
                        entity.id_persistent,
                        entity.id_persistent + '-0',
                        entity.id_persistent + '-1'
                    ]),
                id_contribution_persistent: idContribution
            })
        }
    ])
    await waitFor(() => {
        const state = store.getState().contributionEntity
        for (let idx = 0; idx < 50; ++idx) {
            const entity = state.entities.value[idx]
            expect(entity.cellContents).toEqual([
                newRemote([
                    {
                        isExisting: false,
                        isRequested: false,
                        value: 'val-' + idx,
                        idPersistent: 'id-val-' + idx,
                        version: idx
                    }
                ])
            ])
            expect(entity.similarEntities).toEqual(
                newRemote([
                    newScoredEntity({
                        displayTxt: entity.displayTxt + ` match 0`,
                        displayTxtDetails: 'display_txt_detail',
                        idPersistent: entity.idPersistent + '-0',
                        version: 0,
                        similarity: idx / 100,
                        cellContents: [
                            newRemote([
                                {
                                    idPersistent: `id-val-0-${idx}`,
                                    isExisting: true,
                                    isRequested: false,
                                    value: `val-0-${idx}`,
                                    version: idx
                                }
                            ])
                        ]
                    }),
                    newScoredEntity({
                        displayTxt: entity.displayTxt + ` match 1`,
                        idPersistent: entity.idPersistent + '-1',
                        displayTxtDetails: 'display_txt_detail',
                        version: 0,
                        similarity: idx / 100 + 0.001,
                        cellContents: [
                            newRemote([
                                {
                                    idPersistent: `id-val-1-${idx}`,
                                    isExisting: true,
                                    isRequested: false,
                                    value: `val-1-${idx}`,
                                    version: idx
                                }
                            ])
                        ]
                    })
                ])
            )
        }
        for (let idx = 50; idx < 60; ++idx) {
            const entity = state.entities.value[idx]
            expect(entity.cellContents[0]).toEqual(newRemote([]))
            expect(entity.similarEntities).toEqual(
                newRemote([
                    newScoredEntity({
                        displayTxt: entity.displayTxt + ` match 0`,
                        displayTxtDetails: 'display_txt_detail',
                        idPersistent: entity.idPersistent + '-0',
                        version: 0,
                        similarity: (idx - 50) / 100.0,
                        idMatchTagDefinitionPersistentList: [],
                        cellContents: [newRemote([])]
                    }),
                    newScoredEntity({
                        displayTxt: entity.displayTxt + ` match 1`,
                        displayTxtDetails: 'display_txt_detail',
                        idPersistent: entity.idPersistent + '-1',
                        version: 0,
                        similarity: (idx - 50) / 100.0 + 0.001,
                        idMatchTagDefinitionPersistentList: [],
                        cellContents: [newRemote([])]
                    })
                ])
            )
        }
    })
})
