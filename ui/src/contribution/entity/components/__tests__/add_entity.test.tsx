/**
 * @vitest-environment jsdom
 */
vi.mock('@glideapps/glide-data-grid', () => ({
    __esmodule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    DataEditor: vi.fn().mockImplementation((props: any) => <MockTable />)
}))
import { vi, Mock } from 'vitest'
import { act, RenderOptions, render, waitFor, screen } from '@testing-library/react'
import {
    ContributionEntityState,
    newContributionEntityState,
    newEntityWithDuplicates,
    newScoredEntity
} from '../../state'
import { newRemote } from '../../../../util/state'
import { configureStore } from '@reduxjs/toolkit'
import { contributionEntitySlice } from '../../slice'
import {
    ContributionState,
    contributionSlice,
    newContributionState
} from '../../../slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { EntitiesStep } from '../../components'
import { TagSelectionState, newTagSelectionState } from '../../../../column_menu/state'
import { tagSelectionSlice } from '../../../../column_menu/slice'
import { ContributionStep, newContribution } from '../../../state'
import userEvent from '@testing-library/user-event'
import {
    EntityDetailsState,
    newEntity,
    newEntityDetailsState
} from '../../../../entity/state'
import { entityDetailsReducer } from '../../../../entity/slice'
import { newTableState, TableState } from '../../../../table/state'
import { tableReducer } from '../../../../table/slice'

vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    return { useLoaderData: loaderMock, useNavigate: vi.fn() }
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function MockTable(props: any) {
    return <div className="mock"></div>
}

test('add searched entity', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    addSearchResultResponses(fetchMock)
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock)
    await doSearch(fetchMock)
    await waitFor(() => {
        expect(fetchMock.mock.calls.at(-1)).toEqual([
            `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/entities/score?` +
                `id_entity_contribution_persistent=id-entity-1&id_entity_existing_persistent=${idEntitySearch0}`,
            { credentials: 'include' }
        ])
    })
    const state = store.getState()
    expect(state.contributionEntity.entities.value[1]).toEqual(
        newEntityWithDuplicates({
            idPersistent: 'id-entity-1',
            displayTxt: 'entity 1',
            version: 0,
            disabled: false,
            assignedDuplicate: undefined,
            displayTxtDetails: 'Display Text',
            cellContents: [],
            similarEntities: newRemote([
                newScoredEntity({
                    idPersistent: 'id-entity-1-0',
                    displayTxt: 'entity 1 match 0',
                    displayTxtDetails: 'Display Text',
                    idMatchTagDefinitionPersistentList: [],
                    similarity: 0.01,
                    version: 0,
                    cellContents: []
                }),
                newScoredEntity({
                    idPersistent: 'id-entity-1-1',
                    displayTxt: 'entity 1 match 1',
                    displayTxtDetails: 'Display Text',
                    idMatchTagDefinitionPersistentList: [],
                    similarity: 0.011,
                    version: 0,
                    cellContents: []
                })
            ]),
            entityMap: { 'id-entity-1-0': 0, 'id-entity-1-1': 1 },
            justificationTxt: undefined
        })
    )
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contributionEntity: ContributionEntityState
        contribution: ContributionState
        tagSelection: TagSelectionState
        entityDetails: EntityDetailsState
        table: TableState
    }
}

async function doSearch(fetchMock: Mock) {
    const user = userEvent.setup()
    await waitFor(async () => {
        expect(fetchMock.mock.calls.length).toEqual(7)
        const entity = await screen.findByText('entity 1')
        entity.click()
    })
    await waitFor(async () => {
        const searchBox = await screen.findByRole('textbox')
        await act(async () => {
            await user.type(searchBox, 't')
        })
    })
    await waitFor(async () => {
        const match0 = await screen.findByText(displayTxtSearch0)
        user.click(match0)
    })
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            contributionEntity: newContributionEntityState({}),
            contribution: newContributionState({
                selectedContribution: newRemote(
                    newContribution({
                        idPersistent: idContribution,
                        name: 'contribution test',
                        description: 'A contribution used in tests',
                        hasHeader: true,
                        step: ContributionStep.ValuesExtracted,
                        emptyValues: 'null,na',
                        author: 'author-test'
                    })
                )
            }),
            tagSelection: newTagSelectionState({}),
            entityDetails: newEntityDetailsState({
                entityByIdPersistentMap: {
                    [idEntitySearch0]: newRemote(
                        newEntity({
                            displayTxt: displayTxtSearch0,
                            idPersistent: idEntitySearch0,
                            displayTxtDetails: 'Display Text',
                            disabled: false,
                            version: 70
                        })
                    ),
                    [idEntitySearch1]: newRemote(
                        newEntity({
                            displayTxt: displayTxtSearch1,
                            idPersistent: idEntitySearch1,
                            displayTxtDetails: 'Display Text',
                            disabled: false,
                            version: 71
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
            contributionEntity: contributionEntitySlice.reducer,
            contribution: contributionSlice.reducer,
            tagSelection: tagSelectionSlice.reducer,
            entityDetails: entityDetailsReducer,
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
const idContribution = 'id-contribution-test'
const personList = Array.from({ length: 60 }, (_val, idx) => {
    return {
        display_txt: `entity ${idx}`,
        display_txt_details: 'Display Text',
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
                        id_match_column_persistent_list: [],
                        entity: {
                            display_txt: entity.display_txt + ` match 0`,
                            display_txt_details: 'Display Text',
                            id_persistent: entity.id_persistent + '-0',
                            version: 0
                        }
                    },
                    {
                        similarity: idx / 100.0 + 0.001,
                        id_match_column_persistent_list: [],
                        entity: {
                            display_txt: entity.display_txt + ` match 1`,
                            display_txt_details: 'Display Text',
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
const idTagDef1 = 'id-tag-test-1'
const nameTagDef1 = 'tag def 1'
function initialResponses(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [200, { entity_list: personList }],
        [200, { entity_list: [] }],
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idTagDef0,
                        name_path: [nameTagDef0],
                        name: nameTagDef0,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idTagDef1,
                        name_path: [nameTagDef1],
                        name: nameTagDef1,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    }
                ]
            }
        ],
        [200, { column_list: [] }],
        [200, { column_list: [] }],
        [200, { matches: mkMatches(personList.slice(0, 50)) }],
        [200, { matches: mkMatches(personList.slice(50)) }],
        // empty response because no match tags.
        [200, { value_responses: [] }]
    ])
}

const matchValue0 = 'match 0'
const idEntitySearch0 = 'id-entity-search-0'
const displayTxtSearch0 = 'Search Entity 0'
const matchValue1 = 'match 1'
const idEntitySearch1 = 'id-entity-search-1'
const displayTxtSearch1 = 'Search Entity 1'

function addSearchResultResponses(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                search_result_list: [
                    {
                        match_value: matchValue0,
                        id_entity_persistent: idEntitySearch0,
                        id_column_persistent: null
                    },
                    {
                        match_value: matchValue1,
                        id_entity_persistent: idEntitySearch1,
                        id_column_persistent: null
                    }
                ]
            }
        ]
    ])
}
