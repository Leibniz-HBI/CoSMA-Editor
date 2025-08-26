/**
 * @vitest-environment jsdom
 */
vi.mock('@glideapps/glide-data-grid', () => ({
    __esmodule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    DataEditor: vi.fn().mockImplementation((props: any) => <MockTable />)
}))
import { vi, Mock } from 'vitest'
import { waitFor, screen } from '@testing-library/react'
import { newEntityWithDuplicates, newScoredEntity } from '../../state'
import { newRemote } from '../../../../util/state'
import { newContributionState } from '../../../slice'
import { act } from 'react'
import { EntitiesStep } from '../../components'
import { ContributionStep, newContribution } from '../../../state'
import userEvent from '@testing-library/user-event'
import { newEntity, newEntityDetailsState } from '../../../../entity/state'
import { emptyState, renderWithProviders } from '../../../../util/tests/provider'
import { addResponseSequence, expectFetchCall } from '../../../../util/tests/response'

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
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock, preloadedState)
    await doSearch(fetchMock)
    await waitFor(async () => {
        await expectFetchCall(fetchMock.mock.calls.at(-1), [
            `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/entities/score?` +
                `id_entity_contribution_persistent=id-entity-1&id_entity_existing_persistent=${idEntitySearch0}`,
            { credentials: 'include' }
        ])
    })
    const state = store.getState()
    expect(state.contributionEntity.entities?.value?.at(1)).toEqual(
        newEntityWithDuplicates({
            idPersistent: 'id-entity-1',
            displayTxt: 'entity 1',
            version: 0,
            disabled: false,
            assignedDuplicate: newRemote({
                assignedDuplicate: undefined,
                discard: true
            }),
            displayTxtDetails: 'Display Text',
            cellContents: [],
            similarEntities: newRemote([
                newScoredEntity({
                    idPersistent: 'id-entity-1-0',
                    displayTxt: 'entity 1 match 0',
                    displayTxtDetails: 'Display Text',
                    idMatchColumnPersistentList: [],
                    similarity: 0.01,
                    version: 0,
                    cellContents: []
                }),
                newScoredEntity({
                    idPersistent: 'id-entity-1-1',
                    displayTxt: 'entity 1 match 1',
                    displayTxtDetails: 'Display Text',
                    idMatchColumnPersistentList: [],
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

async function doSearch(fetchMock: Mock) {
    const user = userEvent.setup()
    await waitFor(
        async () => {
            expect(fetchMock.mock.calls.length).toEqual(7)
            const entity = await screen.findByText('entity 1')
            entity.click()
        },
        { timeout: 3000 }
    )
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
                assigned_duplicate:
                    idx % 10 == 0
                        ? {
                              entity: {
                                  display_txt: entity.display_txt + ' match 1',
                                  display_txt_details: 'display_txt_detail',
                                  id_persistent: entity.id_persistent + '-1',
                                  version: 0
                              },
                              similarity: idx / 100.0 + 0.001,
                              id_match_column_persistent_list: []
                          }
                        : undefined,
                discard: idx % 10 == 1
            }
        ])
    )
}
const idColumn0 = 'id-column-test-0'
const nameColumn0 = 'column def 0'
const idColumn1 = 'id-column-test-1'
const nameColumn1 = 'column def 1'
function initialResponses(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [200, { entity_list: personList, next_offset: 500 }],
        [200, { entity_list: [], next_offset: -1 }],
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumn0,
                        name_path: [nameColumn0],
                        name: nameColumn0,
                        curated: true,
                        version: 0,
                        type: 'STRING'
                    },
                    {
                        id_persistent: idColumn1,
                        name_path: [nameColumn1],
                        name: nameColumn1,
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
        // empty response because no match columns.
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

const initialState = {
    ...emptyState,
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
    entityDetails: newEntityDetailsState({
        entityByIdPersistentMap: {
            [idEntitySearch0 + '@']: newRemote(
                newEntity({
                    displayTxt: displayTxtSearch0,
                    idPersistent: idEntitySearch0,
                    displayTxtDetails: 'Display Text',
                    disabled: false,
                    version: 70
                })
            ),
            [idEntitySearch1 + '@']: newRemote(
                newEntity({
                    displayTxt: displayTxtSearch1,
                    idPersistent: idEntitySearch1,
                    displayTxtDetails: 'Display Text',
                    disabled: false,
                    version: 71
                })
            )
        }
    })
}
const preloadedState = { preloadedState: initialState }
