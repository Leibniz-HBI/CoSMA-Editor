/**
 * @vitest-environment jsdom
 */
vi.mock('@glideapps/glide-data-grid', () => ({
    __esmodule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DataEditor: vi.fn().mockImplementation((_props: any) => <MockTable />)
}))
import { vi, Mock } from 'vitest'
import { waitFor, screen } from '@testing-library/react'
import { newContributionEntityState, newScoredEntity } from '../../state'
import { newRemote } from '../../../../util/state'
import { newContributionState } from '../../../slice'
import { EntitiesStep } from '../../components'
import { newColumnSelectionState } from '../../../../column_menu/state'
import { ContributionStep, newContribution } from '../../../state'
import { emptyState, renderWithProviders } from '../../../../util/tests/provider'
import { addResponseSequence, expectFetchCall } from '../../../../util/tests/response'

vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    return { useLoaderData: loaderMock, useNavigate: vi.fn() }
})
function MockTable() {
    return <div className="mock"></div>
}

const idContribution = 'id-contribution-test'
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
                        id_match_column_persistent_list: [],
                        entity: {
                            display_txt: entity.display_txt + ` match 0`,
                            display_txt_details: 'display_txt_detail',
                            id_persistent: entity.id_persistent + '-0',
                            version: 0
                        }
                    },
                    {
                        similarity: idx / 100.0 + 0.001,
                        id_match_column_persistent_list: [],
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
                              similarity: idx / 10,
                              id_match_column_persistent_list: [],
                              entity: {
                                  display_txt: entity.display_txt + ' match 1',
                                  display_txt_details: 'display_txt_detail',
                                  id_persistent: entity.id_persistent + '-1',
                                  version: 0
                              }
                          }
                        : undefined
            }
        ])
    )
}
const idColumn0 = 'id-column-test-0'
const nameColumn0 = 'column def 0'
const idColumnContribution0 = 'id-column-def-contribution-0'
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
        [200, { matches: mkMatches(personList.slice(0, 4)) }],
        [200, { column_list: [] }],
        [200, { column_list: [] }],
        [200, { matches: mkMatches(personList.slice(4, 12)) }],
        [200, { matches: mkMatches(personList.slice(12, 28)) }],
        [200, { matches: mkMatches(personList.slice(28,60)) }],
        // empty response because no match columns.
        [200, { value_responses: [] }]
    ])
}
test('add column values', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    addValueResponses(fetchMock, idColumn0, '1')
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock, initialState)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(9)
        const entity0 = screen.getByText('entity-1')
        entity0.click()
    })
    await addColumnByName(nameColumn0)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(12)
    })
    await checkValueCalls(fetchMock, idColumn0)
    addValueResponses(fetchMock, idColumn1, '2')
    await addColumnByName(nameColumn1)
    // check calls for additional values
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(14)
    })
    await checkValueCalls(fetchMock, idColumn1)
    // check final values!
    await waitFor(() => {
        const state = store.getState()
        expect(
            state.contributionEntity.columnList.map((column) => column.idPersistent)
        ).toEqual([idColumn0, idColumn1])
    })
    await waitFor(() => {
        const state = store.getState().contributionEntity
        for (let idx = 0; idx < 50; ++idx) {
            const entity = state.entities.value?.at(idx)
            expect(entity?.cellContents).toEqual([
                newRemote([
                    {
                        isExisting: false,
                        isRequested: false,
                        value: 'val-1-' + idx,
                        idPersistent: 'id-val-1-' + idx,
                        version: idx
                    }
                ]),
                newRemote([
                    {
                        isExisting: false,
                        isRequested: false,
                        value: 'val-2-' + idx,
                        idPersistent: 'id-val-2-' + idx,
                        version: idx
                    }
                ])
            ])
            expect(entity?.similarEntities).toEqual(
                newRemote([
                    newScoredEntity({
                        displayTxt: entity?.displayTxt + ` match 0`,
                        displayTxtDetails: 'display_txt_detail',
                        idPersistent: entity?.idPersistent + '-0',
                        version: 0,
                        similarity: expect.any(Number),
                        cellContents: [
                            newRemote([
                                {
                                    idPersistent: `id-val-1-0-${idx}`,
                                    isExisting: true,
                                    isRequested: false,
                                    value: `val-1-0-${idx}`,
                                    version: idx
                                }
                            ]),
                            newRemote([
                                {
                                    idPersistent: `id-val-2-0-${idx}`,
                                    isExisting: true,
                                    isRequested: false,
                                    value: `val-2-0-${idx}`,
                                    version: idx
                                }
                            ])
                        ]
                    }),
                    newScoredEntity({
                        displayTxt: entity?.displayTxt + ` match 1`,
                        idPersistent: entity?.idPersistent + '-1',
                        displayTxtDetails: 'display_txt_detail',
                        version: 0,
                        similarity: expect.any(Number),
                        cellContents: [
                            newRemote([
                                {
                                    idPersistent: `id-val-1-1-${idx}`,
                                    isExisting: true,
                                    isRequested: false,
                                    value: `val-1-1-${idx}`,
                                    version: idx
                                }
                            ]),
                            newRemote([
                                {
                                    idPersistent: `id-val-2-1-${idx}`,
                                    isExisting: true,
                                    isRequested: false,
                                    value: `val-2-1-${idx}`,
                                    version: idx
                                }
                            ])
                        ]
                    })
                ])
            )
        }
        for (let idx = 50; idx < 60; ++idx) {
            const entity = state.entities.value?.at(idx)
            expect(entity?.cellContents[0]).toEqual(newRemote([]))
            expect(entity?.similarEntities).toEqual(
                newRemote([
                    newScoredEntity({
                        displayTxt: entity?.displayTxt + ` match 0`,
                        displayTxtDetails: 'display_txt_detail',
                        idPersistent: entity?.idPersistent + '-0',
                        version: 0,
                        similarity: expect.any(Number),
                        idMatchColumnPersistentList: [],
                        cellContents: [newRemote([]), newRemote([])]
                    }),
                    newScoredEntity({
                        displayTxt: entity?.displayTxt + ` match 1`,
                        displayTxtDetails: 'display_txt_detail',
                        idPersistent: entity?.idPersistent + '-1',
                        version: 0,
                        similarity: expect.any(Number),
                        idMatchColumnPersistentList: [],
                        cellContents: [newRemote([]), newRemote([])]
                    })
                ])
            )
        }
    })
})
test('remove values', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock)
    addValueResponses(fetchMock, idColumn0, '1')
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock, initialState)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(9)
        const entity0 = screen.getByText('entity-0')
        entity0.click()
    })
    await addColumnByName(nameColumn0)
    await waitFor(() => {
        const state = store.getState()
        expect(state.contributionEntity.columnList.length).toEqual(1)
    })
    await addColumnByName(nameColumn0)
    await waitFor(
        () => {
            const state = store.getState()
            expect(state.contributionEntity.columnList.length).toEqual(0)
            expect(state.contributionEntity.columnMap).toEqual({})
            for (const entity of state.contributionEntity.entities.value ?? []) {
                expect(entity.cellContents.length).toEqual(0)
                for (const match of entity.similarEntities.value) {
                    expect(match.cellContents.length).toEqual(0)
                }
            }
        },
        { timeout: 3000 }
    )
})

function addValueResponses(
    fetchMock: Mock,
    idColumn: string,
    suffix: string
) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                value_responses: personList.slice(0, 50).flatMap((entity, idx) => [
                    // contributed instance
                    {
                        id_entity_persistent: entity.id_persistent,
                        id_column: idColumnContribution0,
                        id_column_requested_persistent: idColumn,
                        is_existing: false,
                        version: idx,
                        value: `val-${suffix}-` + idx,
                        id_persistent: `id-val-${suffix}-` + idx
                    },
                    //existing instance for first match
                    {
                        id_entity_persistent: entity.id_persistent + '-0',
                        id_column_requested_persistent: idColumn,
                        id_column: idColumn,
                        is_existing: true,
                        version: idx,
                        value: `val-${suffix}-0-` + idx,
                        id_persistent: `id-val-${suffix}-0-` + idx
                    },
                    // existing instance for second match
                    {
                        id_entity_persistent: entity.id_persistent + '-1',
                        id_column: idColumn,
                        id_column_requested_persistent: idColumn,
                        is_existing: true,
                        version: idx,
                        value: `val-${suffix}-1-` + idx,
                        id_persistent: `id-val-${suffix}-1-` + idx
                    }
                ])
            }
        ],
        // no further values
        [200, { value_responses: [] }]
    ])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkValueCalls(fetchMock: Mock<any>, idColumn: string) {
    await expectFetchCall(fetchMock.mock.calls.at(-2), [
        'http://127.0.0.1:8000/cosmae/api/values/entities',
        {
            credentials: 'include',
            method: 'POST',
            body: {
                id_column_persistent_list: [idColumn],
                id_entity_persistent_list: personList
                    .slice(0, 50)
                    .flatMap((entity) => [
                        entity.id_persistent,
                        entity.id_persistent + '-0',
                        entity.id_persistent + '-1'
                    ]),
                id_contribution_persistent: idContribution
            }
        }
    ])
    await expectFetchCall(fetchMock.mock.calls.at(-1), [
        'http://127.0.0.1:8000/cosmae/api/values/entities',
        {
            credentials: 'include',
            method: 'POST',
            body: {
                id_column_persistent_list: [idColumn],
                id_entity_persistent_list: personList
                    .slice(50)
                    .flatMap((entity) => [
                        entity.id_persistent,
                        entity.id_persistent + '-0',
                        entity.id_persistent + '-1'
                    ]),
                id_contribution_persistent: idContribution
            }
        }
    ])
}

async function addColumnByName(nameColumn: string) {
    await waitFor(() => {
        const additionalColumnButtons = screen.getByRole('button', {
            name: /show additional column/i
        })
        additionalColumnButtons.click()
    })
    let columnLabel: HTMLElement | undefined
    await waitFor(() => {
        columnLabel = screen.getByText(nameColumn)
    })
    const columnListItem =
        columnLabel?.parentElement?.parentElement?.parentElement?.parentElement
            ?.parentElement
    const columnButton = columnListItem?.children[1]
    expect(columnButton?.className).toEqual('icon')
    ;(columnButton as HTMLElement)?.click()

    screen.getByRole('button', { name: /close/i }).click()
}

const preloadedState = {
        ...emptyState,
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
        columnSelection: newColumnSelectionState({})
    },
    initialState = { preloadedState }
