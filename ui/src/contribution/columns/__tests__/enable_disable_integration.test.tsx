/**
 * @vitest-environment jsdom
 */

import {
    RenderOptions,
    getByRole,
    render,
    screen,
    waitFor
} from '@testing-library/react'
import {
    ColumnDefinitionsContributionState,
    newColumnDefinitionsContributionState
} from '../state'
import { newRemote } from '../../../util/state'
import { contributionColumnDefinitionSlice } from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { PropsWithChildren } from 'react'
import { ColumnDefinitionStep } from '../components'
import { ToolkitStore } from '@reduxjs/toolkit/dist/configureStore'
import { ContributionStep, newContribution } from '../../state'
import { TagSelectionState, newTagSelectionState } from '../../../column_menu/state'
import { tagSelectionSlice } from '../../../column_menu/slice'
import { ContributionState, contributionSlice, newContributionState } from '../../slice'
import { vi, Mock } from 'vitest'
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

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contributionColumnDefinition: ColumnDefinitionsContributionState
        contribution: ContributionState
        tagSelection: TagSelectionState
    }
}
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
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
            tagSelection: newTagSelectionState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contributionColumnDefinition: contributionColumnDefinitionSlice.reducer,
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
const idTagDef0 = 'id-tag-test-0'
const nameTagDef0 = 'tag def 0'

describe('beginning', () => {
    test('discard, enable', async () => {
        const fetchMock = vi.fn()
        initialResponseSequence(fetchMock)
        addResponseSequence(fetchMock, [
            [200, { ...contributionColumnActiveRsp0, discard: true }],
            [200, contributionColumnActiveRsp0]
        ])
        const { store } = renderWithProviders(<ColumnDefinitionStep />, fetchMock)
        let columnLabel0: HTMLElement | undefined
        await waitFor(() => {
            screen.getByText(nameTagDef0)
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
        let columnEntry = columnLabel0?.parentElement?.parentElement?.parentElement

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
        columnEntry = columnLabel0?.parentElement?.parentElement?.parentElement

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
        expect(fetchMock.mock.calls).toEqual([
            [
                `http://127.0.0.1/api/contributions/${idContribution}/tags`,
                { credentials: 'include' }
            ],
            [
                `http://127.0.0.1/api/contributions/${idContribution}/preview/id-active-0`,
                { credentials: 'include' }
            ],
            [
                'http://127.0.0.1/api/tags/definitions/children',
                {
                    body: '{}',
                    credentials: 'include',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }
            ],
            [
                'http://127.0.0.1/api/tags/definitions/children',
                {
                    body: JSON.stringify({ id_parent_persistent: idTagDef0 }),
                    credentials: 'include',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }
            ],
            [
                `http://127.0.0.1/api/contributions/${idContribution}/tags/${contributionColumnActiveRsp0.id_persistent}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    body: JSON.stringify({ discard: true })
                }
            ],
            [
                `http://127.0.0.1/api/contributions/${idContribution}/tags/${contributionColumnActiveRsp0.id_persistent}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    body: JSON.stringify({ discard: false })
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
        const { store } = renderWithProviders(<ColumnDefinitionStep />, fetchMock)
        let columnLabel2: HTMLElement | undefined
        await waitFor(() => {
            columnLabel2 = screen.getByText(contributionColumnActiveRsp2.name)
            screen.getByText(nameTagDef0)
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
        let columnEntry = columnLabel2?.parentElement?.parentElement?.parentElement

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
        columnEntry = columnLabel2?.parentElement?.parentElement?.parentElement

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
        const { store } = renderWithProviders(<ColumnDefinitionStep />, fetchMock)
        let columnLabel4: HTMLElement | undefined
        await waitFor(() => {
            columnLabel4 = screen.getByText(contributionColumnActiveRsp4.name)
            screen.getByText(nameTagDef0)
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
        let columnEntry = columnLabel4?.parentElement?.parentElement?.parentElement

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
        columnEntry = columnLabel4?.parentElement?.parentElement?.parentElement

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
                tag_definitions: [
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
        [200, { tag_definitions: [] }]
    ])
}

function expectActiveDiscardedIds(
    store: ToolkitStore<{
        contributionColumnDefinition: ColumnDefinitionsContributionState
        contribution: ContributionState
        tagSelection: TagSelectionState
    }>,
    expectedActiveIdList: string[],
    expectedDiscardedIdList: string[]
) {
    expect(
        store
            .getState()
            .contributionColumnDefinition.columns.value?.activeDefinitionsList.map(
                (col) => col.idPersistent
            )
    ).toEqual(expectedActiveIdList)
    expect(
        store
            .getState()
            .contributionColumnDefinition.columns.value?.discardedDefinitionsList.map(
                (col) => col.idPersistent
            )
    ).toEqual(expectedDiscardedIdList)
}
