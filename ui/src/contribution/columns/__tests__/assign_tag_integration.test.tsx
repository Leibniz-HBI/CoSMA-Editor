/**
 * @vitest-environment jsdom
 */

import {
    RenderOptions,
    getByRole,
    queryByRole,
    render,
    screen,
    waitFor
} from '@testing-library/react'
import {
    ColumnDefinitionsContributionState,
    newColumnDefinitionsContributionState
} from '../state'
import { newRemote } from '../../../util/state'
import { configureStore } from '@reduxjs/toolkit'
import { contributionColumnDefinitionSlice } from '../slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ColumnDefinitionStep } from '../components'
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
export const contributionColumnActiveRsp1 = {
    name: 'column definition contribution test active 2',
    id_persistent: 'id-active-2',
    index_in_file: 2,
    discard: false
}
const idTagDef0 = 'id-tag-test-0'
const nameTagDef0 = 'tag def 0'
test('assign existing', async () => {
    const fetchMock = vi.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                tag_definitions: [
                    contributionColumnActiveRsp0,
                    contributionColumnActiveRsp1
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
        [200, { contribution_values: [], destination_values: [] }],
        [200, { tag_definitions: [] }],
        [
            200,
            { ...contributionColumnActiveRsp1, id_existing_persistent: 'display_txt' }
        ],
        [200, { contribution_values: [], destination_values: [] }]
    ])
    const { store } = renderWithProviders(<ColumnDefinitionStep />, fetchMock)
    let title2: HTMLElement | undefined
    await waitFor(() => {
        title2 = screen.getByText(contributionColumnActiveRsp1.name)
    })
    title2?.click()
    await waitFor(() =>
        expect(
            store.getState().contributionColumnDefinition.selectedColumnDefinition.value
                ?.idPersistent
        ).toEqual(contributionColumnActiveRsp1.id_persistent)
    )
    const displayTxtLabel = await screen.findByText('Display Text')
    const displayTxtEntry =
        displayTxtLabel.parentElement?.parentElement?.parentElement?.parentElement
            ?.parentElement
    expect(
        queryByRole(displayTxtEntry as HTMLElement, 'button', {
            name: /Selected/i
        })
    ).toBeNull()
    const radioButton = getByRole(displayTxtEntry as HTMLElement, 'button', {
        name: /Select/i
    })
    radioButton.click()
    await waitFor(() => {
        getByRole(displayTxtEntry as HTMLElement, 'button', {
            name: /Selected/i
        })
        expect(
            store.getState().contributionColumnDefinition.selectedColumnDefinition.value
                ?.idExistingPersistent
        ).toEqual('display_txt')
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/tags`,
            { credentials: 'include' }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/preview/id-active-0`,
            { credentials: 'include' }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/tags/definitions/children',
            {
                body: '{}',
                credentials: 'include',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/preview/id-active-2`,
            { credentials: 'include' }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/tags/definitions/children',
            {
                body: JSON.stringify({ id_parent_persistent: idTagDef0 }),
                credentials: 'include',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/tags/${contributionColumnActiveRsp1.id_persistent}`,
            {
                method: 'PATCH',
                credentials: 'include',
                body: JSON.stringify({ id_existing_persistent: 'display_txt' })
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/contributions/id-contribution-test/preview/id-active-2',
            {
                credentials: 'include'
            }
        ]
    ])
})
