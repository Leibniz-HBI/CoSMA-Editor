/**
 * @vitest-environment jsdom
 */

import { getByRole, screen, waitFor } from '@testing-library/react'
import {
    ColumnDefinitionContribution,
    ColumnDefinitionsContributionState,
    newColumnDefinitionsContributionState
} from '../state'
import { newRemote } from '../../../util/state'
import { ColumnDefinitionStep } from '../components'
import { ContributionStep, newContribution } from '../../state'
import {
    ColumnSelectionState,
    newColumnSelectionState
} from '../../../column_menu/state'
import { ContributionState, newContributionState } from '../../slice'
import { vi, Mock } from 'vitest'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { EnhancedStore } from '@reduxjs/toolkit'
vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    return { useLoaderData: loaderMock, useNavigate: vi.fn() }
})
vi.mock('react-flip-toolkit', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Flipper: (props: any) => <div>{props.children}</div>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Flipped: (props: any) => <div>{props.children}</div>
    }
})

export const idContribution = 'id-contribution-test'
const authorTest = 'author test'
export const contributionColumnActiveRsp0 = {
    name: 'column definition contribution test active 0',
    id_persistent: 'id-active-0',
    index_in_file: 0,
    discard: false
}
export const contributionColumnActiveRsp2 = {
    name: 'column definition contribution test active 2',
    id_persistent: 'id-active-2',
    index_in_file: 2,
    discard: false
}
export const contributionColumnActiveRsp4 = {
    name: 'column definition contribution test active 4',
    id_persistent: 'id-active-4',
    index_in_file: 4,
    discard: false
}
export const contributionColumnDiscardRsp1 = {
    name: 'column definition contribution test discard 1',
    id_persistent: 'id-discard-1',
    index_in_file: 1,
    discard: true
}
export const contributionColumnDiscardRsp3 = {
    name: 'column definition contribution test discard 3',
    id_persistent: 'id-discard-3',
    index_in_file: 3,
    discard: true
}
const idColumn0 = 'id-column-test-0'
const nameColumn0 = 'column def 0'

describe('beginning', () => {
    test('discard, enable', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [
            [200, { ...contributionColumnActiveRsp0, discard: true }],
            [200, contributionColumnActiveRsp0]
        ])
        const { store } = renderWithProviders(
            <ColumnDefinitionStep />,
            fetchMock,
            initialState
        )
        let columnLabel0: HTMLElement | undefined
        await waitFor(() => {
            screen.getByText(nameColumn0)
            columnLabel0 = screen.getByText(contributionColumnActiveRsp0.name)
        })

        expectActiveDiscardedIds(
            store,
            [
                contributionColumnActiveRsp0.id_persistent,
                contributionColumnActiveRsp2.id_persistent,
                contributionColumnActiveRsp4.id_persistent
            ],
            [
                contributionColumnDiscardRsp1.id_persistent,
                contributionColumnDiscardRsp3.id_persistent
            ]
        )
        let columnEntry = columnLabel0?.parentElement?.parentElement?.parentElement?.parentElement

        let toggle = getByRole(columnEntry as HTMLElement, 'checkbox')
        expect((toggle as HTMLInputElement).value).toEqual('on')
        toggle.click()
        await waitFor(() => {
            expectActiveDiscardedIds(
                store,
                [
                    contributionColumnActiveRsp2.id_persistent,
                    contributionColumnActiveRsp4.id_persistent
                ],
                [
                    contributionColumnActiveRsp0.id_persistent,
                    contributionColumnDiscardRsp1.id_persistent,
                    contributionColumnDiscardRsp3.id_persistent
                ]
            )
        })
        await waitFor(() => {
            columnLabel0 = screen.getByText(contributionColumnActiveRsp0.name)
        })
        columnEntry = columnLabel0?.parentElement?.parentElement?.parentElement?.parentElement

        toggle = getByRole(columnEntry as HTMLElement, 'checkbox')
        expect((toggle as HTMLInputElement).value).toEqual('on')
        toggle.click()
        await waitFor(() => {
            expectActiveDiscardedIds(
                store,
                [
                    contributionColumnActiveRsp0.id_persistent,
                    contributionColumnActiveRsp2.id_persistent,
                    contributionColumnActiveRsp4.id_persistent
                ],
                [
                    contributionColumnDiscardRsp1.id_persistent,
                    contributionColumnDiscardRsp3.id_persistent
                ]
            )
        })
        await expectFetchCallList(fetchMock.mock.calls, [
            [
                `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/columns`,
                { credentials: 'include' }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/preview/id-active-0`,
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/columns/children',
                {
                    body: {},
                    credentials: 'include',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/columns/children',
                {
                    body: { id_parent_persistent: idColumn0 },
                    credentials: 'include',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/columns/${contributionColumnActiveRsp0.id_persistent}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    body: { discard: true }
                }
            ],
            [
                `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/columns/${contributionColumnActiveRsp0.id_persistent}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    body: { discard: false }
                }
            ]
        ])
    })
})
describe('middle', () => {
    test('discard, enable', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [
            [200, { ...contributionColumnActiveRsp2, discard: true }],
            [200, { contribution_values: [], destination_values: [] }],
            [200, contributionColumnActiveRsp2]
        ])
        const { store } = renderWithProviders(
            <ColumnDefinitionStep />,
            fetchMock,
            initialState
        )
        let columnLabel2: HTMLElement | undefined
        await waitFor(() => {
            columnLabel2 = screen.getByText(contributionColumnActiveRsp2.name)
            screen.getByText(nameColumn0)
        })

        expectActiveDiscardedIds(
            store,
            [
                contributionColumnActiveRsp0.id_persistent,
                contributionColumnActiveRsp2.id_persistent,
                contributionColumnActiveRsp4.id_persistent
            ],
            [
                contributionColumnDiscardRsp1.id_persistent,
                contributionColumnDiscardRsp3.id_persistent
            ]
        )
        let columnEntry = columnLabel2?.parentElement?.parentElement?.parentElement?.parentElement

        let toggle = getByRole(columnEntry as HTMLElement, 'checkbox')
        expect((toggle as HTMLInputElement).value).toEqual('on')
        toggle.click()
        await waitFor(() => {
            expectActiveDiscardedIds(
                store,
                [
                    contributionColumnActiveRsp0.id_persistent,
                    contributionColumnActiveRsp4.id_persistent
                ],
                [
                    contributionColumnDiscardRsp1.id_persistent,
                    contributionColumnActiveRsp2.id_persistent,
                    contributionColumnDiscardRsp3.id_persistent
                ]
            )
        })
        await waitFor(() => {
            columnLabel2 = screen.getByText(contributionColumnActiveRsp2.name)
        })
        columnEntry = columnLabel2?.parentElement?.parentElement?.parentElement?.parentElement

        toggle = getByRole(columnEntry as HTMLElement, 'checkbox')
        expect((toggle as HTMLInputElement).value).toEqual('on')
        toggle.click()
        await waitFor(() => {
            expectActiveDiscardedIds(
                store,
                [
                    contributionColumnActiveRsp0.id_persistent,
                    contributionColumnActiveRsp2.id_persistent,
                    contributionColumnActiveRsp4.id_persistent
                ],
                [
                    contributionColumnDiscardRsp1.id_persistent,
                    contributionColumnDiscardRsp3.id_persistent
                ]
            )
        })
    })
})
describe('end', () => {
    test('discard, enable', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [
            [200, { ...contributionColumnActiveRsp4, discard: true }],
            [200, { contribution_values: [], destination_values: [] }],
            [200, contributionColumnActiveRsp4]
        ])
        const { store } = renderWithProviders(
            <ColumnDefinitionStep />,
            fetchMock,
            initialState
        )
        let columnLabel4: HTMLElement | undefined
        await waitFor(() => {
            columnLabel4 = screen.getByText(contributionColumnActiveRsp4.name)
            screen.getByText(nameColumn0)
        })

        expectActiveDiscardedIds(
            store,
            [
                contributionColumnActiveRsp0.id_persistent,
                contributionColumnActiveRsp2.id_persistent,
                contributionColumnActiveRsp4.id_persistent
            ],
            [
                contributionColumnDiscardRsp1.id_persistent,
                contributionColumnDiscardRsp3.id_persistent
            ]
        )
        let columnEntry = columnLabel4?.parentElement?.parentElement?.parentElement?.parentElement

        let toggle = getByRole(columnEntry as HTMLElement, 'checkbox')
        expect((toggle as HTMLInputElement).value).toEqual('on')
        toggle.click()
        await waitFor(() => {
            expectActiveDiscardedIds(
                store,
                [
                    contributionColumnActiveRsp0.id_persistent,
                    contributionColumnActiveRsp2.id_persistent
                ],
                [
                    contributionColumnDiscardRsp1.id_persistent,
                    contributionColumnDiscardRsp3.id_persistent,
                    contributionColumnActiveRsp4.id_persistent
                ]
            )
        })
        await waitFor(() => {
            columnLabel4 = screen.getByText(contributionColumnActiveRsp4.name)
        })
        columnEntry = columnLabel4?.parentElement?.parentElement?.parentElement?.parentElement

        toggle = getByRole(columnEntry as HTMLElement, 'checkbox')
        expect((toggle as HTMLInputElement).value).toEqual('on')
        toggle.click()
        await waitFor(() => {
            expectActiveDiscardedIds(
                store,
                [
                    contributionColumnActiveRsp0.id_persistent,
                    contributionColumnActiveRsp2.id_persistent,
                    contributionColumnActiveRsp4.id_persistent
                ],
                [
                    contributionColumnDiscardRsp1.id_persistent,
                    contributionColumnDiscardRsp3.id_persistent
                ]
            )
        })
    })
})
function initialResponseSequence(fetchMock: Mock) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                column_list: [
                    contributionColumnActiveRsp0,
                    contributionColumnDiscardRsp1,
                    contributionColumnActiveRsp2,
                    contributionColumnDiscardRsp3,
                    contributionColumnActiveRsp4
                ]
            }
        ],
        [200, { contribution_values: [], destination_values: [] }],
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
                    }
                ]
            }
        ],
        [200, { column_list: [] }]
    ])
}

function expectActiveDiscardedIds(
    store: EnhancedStore<{
        contributionColumnDefinition: ColumnDefinitionsContributionState
        contribution: ContributionState
        columnSelection: ColumnSelectionState
    }>,
    expectedActiveIdList: string[],
    expectedDiscardedIdList: string[]
) {
    expect(
        store
            .getState()
            .contributionColumnDefinition.columns.value?.activeDefinitionsList.map(
                (col: ColumnDefinitionContribution) => col.idPersistent
            )
    ).toEqual(expectedActiveIdList)
    expect(
        store
            .getState()
            .contributionColumnDefinition.columns.value?.discardedDefinitionsList.map(
                (col: ColumnDefinitionContribution) => col.idPersistent
            )
    ).toEqual(expectedDiscardedIdList)
}

const preloadedState = {
    ...emptyState,
    contributionColumnDefinition: newColumnDefinitionsContributionState({
        columns: newRemote(undefined)
    }),
    contribution: newContributionState({
        selectedContribution: newRemote(
            newContribution({
                name: 'contribution test',
                idPersistent: idContribution,
                description: 'a contribution for tests',
                step: ContributionStep.ColumnsExtracted,
                hasHeader: true,
                emptyValues: 'null,na',
                author: authorTest
            })
        )
    }),
    columnSelection: newColumnSelectionState({})
}
const initialState = { preloadedState }
