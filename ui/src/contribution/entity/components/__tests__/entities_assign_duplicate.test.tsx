/**
 * @vitest-environment jsdom
 */
vi.mock('@glideapps/glide-data-grid', async () => {
    const actual = await vi.importActual('@glideapps/glide-data-grid')
    return {
        __esmodule: true,
        DataEditor: vi
            .fn()
            .mockImplementation((props: object) => <MockTable {...props} />),
        CompactSelection: actual.CompactSelection
    }
})
import { vi, Mock } from 'vitest'
import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import {
    ContributionEntityState,
    newContributionEntityState,
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
import {
    ColumnSelectionState,
    newColumnSelectionState
} from '../../../../column_menu/state'
import { columnSelectionReducer } from '../../../../column_menu/slice'
import { Button, Col, Row } from 'react-bootstrap'
import {
    CompactSelection,
    GridSelection,
    Item,
    Rectangle
} from '@glideapps/glide-data-grid'
import { ContributionStep, newContribution } from '../../../state'
import { emptyState, renderWithProviders } from '../../../../util/tests/provider'
import { addResponseSequence } from '../../../../util/tests/response'

vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    return { useLoaderData: loaderMock, useNavigate: vi.fn() }
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MockTable(props: any) {
    return (
        <div className="mock">
            <Col>
                {Array.from({ length: props.rows }, (_, idx: number) => idx).map(
                    (idxRow) => (
                        <Row>
                            {Array.from(
                                { length: props.columns.length },
                                (_, idx: number) => idx
                            ).map((idxCol) => {
                                const cell = props.getCellContent([idxCol, idxRow])
                                if (cell.kind == 'text') {
                                    return <Col>{cell.displayData}</Col>
                                } else if (cell.kind == 'custom') {
                                    const replaceInfo = cell.data
                                    const buttonText = replaceInfo.isNew
                                        ? 'Merge with Existing'
                                        : 'Create New Entity'
                                    const selection: GridSelection = {
                                        current: {
                                            cell: [idxCol, idxRow] as Item,
                                            range: {
                                                x: idxCol,
                                                y: idxRow,
                                                width: 1,
                                                height: 1
                                            } as Rectangle,
                                            rangeStack: []
                                        },
                                        columns: CompactSelection.empty(),
                                        rows: CompactSelection.empty()
                                    }
                                    return (
                                        <Col>
                                            <Button
                                                onClick={() =>
                                                    props.onGridSelectionChange(
                                                        selection
                                                    )
                                                }
                                            >
                                                {buttonText}
                                            </Button>
                                        </Col>
                                    )
                                }
                                return <Col></Col>
                            })}
                        </Row>
                    )
                )}
            </Col>
        </div>
    )
}

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contributionEntity: ContributionEntityState
        contribution: ContributionState
        columnSelection: ColumnSelectionState
    }
}

const idContribution = 'id-contribution-test'
const contribution = newContribution({
    idPersistent: idContribution,
    name: 'contribution test',
    description: 'A contribution used in tests',
    hasHeader: true,
    step: ContributionStep.ValuesExtracted,
    emptyValues: 'null,na',
    author: 'author-test'
})
const preloadedState = {
        ...emptyState,
        contributionEntity: newContributionEntityState({}),
        contribution: newContributionState({
            selectedContribution: newRemote({
                ...contribution,
                justification: 'justification'
            })
        }),
        columnSelection: newColumnSelectionState({})
    },
    initialState = { preloadedState }

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
function initialResponses(
    fetchMock: Mock,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    personList: any,
    numIncludedMatches: number
) {
    addResponseSequence(fetchMock, [
        [200, { entity_list: personList, next_offset: 500 }],
        [200, { entity_list: [], next_offset: -1 }],
        [200, { column_list: [] }],
        [200, { matches: mkMatches(personList.slice(0, numIncludedMatches)) }]
    ])
}

test('merge with existing', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock, personList, 50)
    addResponseSequence(fetchMock, [[200, {}]])
    addResponseSequence(fetchMock, [
        [200, { value_responses: [] }],
        [
            200,
            {
                assigned_duplicate: {
                    similarity: 0.8,
                    id_match_column_persistent_list: [],
                    entity: {
                        id_persistent: 'id-entity-1-0',
                        display_txt: 'entity-1 match 0',
                        display_txt_details: 'display_txt_detail',
                        version: 0,
                        disabled: false
                    }
                }
            }
        ],
        [200, { value_responses: [] }],
        [
            200,
            {
                assigned_duplicate: {
                    similarity: 0.9,
                    id_match_column_persistent_list: [],
                    entity: {
                        id_persistent: 'id-entity-2-1',
                        display_txt: 'entity-2 match 1',
                        display_txt_details: 'display_txt_detail',
                        version: 0,
                        disabled: false
                    }
                }
            }
        ],
        [200, { value_responses: [] }],
        [200, { assigned_duplicate: undefined }],
        [200, { value_responses: [] }]
    ])
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock, initialState)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(5)
    })
    screen.getByText(/Please select an entity/i)
    screen.queryByText('entity-1')?.click()
    await waitFor(() => {
        screen.getByText('entity-1 match 0')
        const buttons = screen.getAllByRole('button', { name: /Merge with Existing/i })
        expect(buttons.length).toEqual(2)
        buttons[0].click()
    })
    await waitFor(() => {
        screen.getByText('entity-2 match 1')
        const buttons2 = screen.getAllByRole('button', {
            name: /Merge with Existing/i
        })
        expect(buttons2.length).toEqual(2)
        buttons2[1].click()
    })
    await waitFor(() => {
        const state = store.getState().contributionEntity
        expect(state.entities.value?.at(1)?.assignedDuplicate).toEqual(
            newRemote(
                newScoredEntity({
                    similarity: 0.8,
                    idMatchColumnPersistentList: [],
                    idPersistent: 'id-entity-1-0',
                    displayTxt: 'entity-1 match 0',
                    displayTxtDetails: 'display_txt_detail',
                    version: 0
                })
            )
        )
    })
    await waitFor(() => {
        const state = store.getState().contributionEntity
        expect(state.entities.value?.at(2)?.assignedDuplicate).toEqual(
            newRemote(
                newScoredEntity({
                    similarity: 0.9,
                    idMatchColumnPersistentList: [],
                    idPersistent: 'id-entity-2-1',
                    displayTxt: 'entity-2 match 1',
                    displayTxtDetails: 'display_txt_detail',
                    version: 0
                })
            )
        )
    }, {})
    expect(fetchMock.mock.calls.at(-3)).toEqual([
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/entities/id-entity-1/duplicate`,
        {
            body: JSON.stringify({ id_entity_destination_persistent: 'id-entity-1-0' }),
            credentials: 'include',
            method: 'PUT'
        }
    ])
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/entities/id-entity-2/duplicate`,
        {
            body: JSON.stringify({ id_entity_destination_persistent: 'id-entity-2-1' }),
            credentials: 'include',
            method: 'PUT'
        }
    ])
    await waitFor(() => {
        screen.getByText('entity-3 match 0')
        const button = screen.getByRole('button', { name: /Create New Entity/i })
        button.click()
    })
    await waitFor(() => {
        const state = store.getState().contributionEntity
        expect(state.entities.value?.at(3)?.assignedDuplicate).toEqual(
            newRemote(undefined)
        )
    })
    expect(fetchMock.mock.calls.at(-1)).toEqual([
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/entities/id-entity-3/duplicate`,
        {
            body: JSON.stringify({}),
            credentials: 'include',
            method: 'PUT'
        }
    ])
})
test('last match', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock, personList.slice(0, 1), 1)
    addResponseSequence(fetchMock, [
        [200, { value_responses: [] }],
        [
            200,
            {
                assigned_duplicate: null
            }
        ]
    ])
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock, initialState)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(4)
    })
    screen.getByText(/Please select an entity/i)
    await waitFor(() => {
        screen.getByText('entity-0')?.click()
    })
    await waitFor(() => {
        const button = screen.getByRole('button', { name: /Create New Entity/i })
        button.click()
    })
    await waitFor(() => {
        expect(store.getState().contributionEntity.hitLastMatch).toBeTruthy()
        screen.getByText('You processed the last entity')
    })
})
test('open justification modal', async () => {
    const fetchMock = vi.fn()
    initialResponses(fetchMock, personList, 1)
    addResponseSequence(fetchMock, [
        [200, {}],
        [200, { value_responses: [] }],
        [
            200,
            {
                assigned_duplicate: null
            }
        ]
    ])
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock, {
        preloadedState: {
            ...emptyState,
            contribution: newContributionState({
                selectedContribution: newRemote(contribution)
            }),
            contributionEntity: newContributionEntityState({}),
            columnSelection: newColumnSelectionState({})
        }
    })
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(4)
    })
    expect(screen.queryByText('Add Justification')).toBeNull()
    screen.getByText(/Please select an entity/i)
    await waitFor(() => {
        screen.getByText('entity-0')?.click()
    })
    await waitFor(() => {
        const button = screen.getByRole('button', { name: /Create New Entity/i })
        button.click()
    })
    await waitFor(() => {
        screen.getByText('Add Justification')
    })
    expect(store.getState().contributionEntity.showJustificationDialog).toEqual(true)
})

test('does not open modal for entity with justification', async () => {
    const fetchMock = vi.fn()
    initialResponses(
        fetchMock,
        [
            {
                display_txt: 'entity-0',
                display_txt_details: 'display_txt_detail',
                version: 0,
                id_persistent: 'id-entity-0',
                justification_txt: 'justification'
            }
        ],
        1
    )
    addResponseSequence(fetchMock, [
        [200, { value_responses: [] }],
        [
            200,
            {
                assigned_duplicate: null
            }
        ]
    ])
    const { store } = renderWithProviders(<EntitiesStep />, fetchMock, initialState)
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(4)
    })
    expect(screen.queryByText('Add Justification')).toBeNull()
    screen.getByText(/Please select an entity/i)
    await waitFor(() => {
        screen.getByText('entity-0')?.click()
    })
    await waitFor(() => {
        const button = screen.getByRole('button', { name: /Create New Entity/i })
        button.click()
    })
    await waitFor(() => {
        expect(fetchMock.mock.calls.at(-1)).toEqual([
            `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/entities/id-entity-0/duplicate`,
            {
                body: JSON.stringify({}),
                credentials: 'include',
                method: 'PUT'
            }
        ])
        expect(store.getState().contributionEntity.showJustificationDialog).toBeFalsy()
        expect(screen.queryByText('Add Justification')).toBeNull()
    })
})
