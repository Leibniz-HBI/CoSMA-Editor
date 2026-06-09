/**
 * @vitest-environment jsdom
 */

import { getByRole, queryByRole, screen, waitFor } from '@testing-library/react'
import { newColumnDefinitionsContributionState } from '../state'
import { newRemote } from '../../../util/state'
import { ColumnDefinitionStep } from '../components'
import { ContributionStep, newContribution } from '../../state'
import { newContributionState } from '../../slice'
import { Mock, vi } from 'vitest'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { Procedure } from '@vitest/spy'

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
export const contributionColumnActiveRsp1 = {
    name: 'column definition contribution test active 2',
    id_persistent: 'id-active-2',
    index_in_file: 2,
    discard: false
}
const idColumn0 = 'id-column-test-0'
const nameColumn0 = 'column 0'
test('assign existing', async () => {
    const fetchMock = vi.fn()
    initialResponse(fetchMock)
    const { store } = renderWithProviders(
        <ColumnDefinitionStep />,
        fetchMock,
        initialState
    )
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
    let radioButton = getByRole(displayTxtEntry as HTMLElement, 'button', {
        name: /Select/i
    })
    radioButton.click()
    radioButton = await waitFor(() => {
        const radioButton = getByRole(displayTxtEntry as HTMLElement, 'button', {
            name: /Deselect/i
        })
        expect(
            store.getState().contributionColumnDefinition.selectedColumnDefinition.value
                ?.idExistingPersistent
        ).toEqual('display_txt')
        return radioButton
    })
    radioButton.click()
    await waitFor(() => {
        expect(
            queryByRole(displayTxtEntry as HTMLElement, 'button', {
                name: /Deselect/i
            })
        ).toBeNull()
        expect(
            store.getState().contributionColumnDefinition.selectedColumnDefinition.value
                ?.discard
        ).toBeTruthy()
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
            `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/preview/id-active-2`,
            { credentials: 'include' }
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
            `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/columns/${contributionColumnActiveRsp1.id_persistent}`,
            {
                method: 'PATCH',
                credentials: 'include',
                body: { id_existing_persistent: 'display_txt' }
            }
        ],
        [
            'http://127.0.0.1:8000/cosmae/api/contributions/id-contribution-test/preview/id-active-2',
            {
                credentials: 'include'
            }
        ],
        [
            `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/columns/${contributionColumnActiveRsp1.id_persistent}`,
            {
                method: 'PATCH',
                credentials: 'include',
                body: { discard: true }
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
    })
}
const initialState = { preloadedState }

function initialResponse(fetchMock: Mock<Procedure>) {
    addResponseSequence(fetchMock, [
        [
            200,
            {
                column_list: [
                    contributionColumnActiveRsp0,
                    contributionColumnActiveRsp1
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
        [200, { column_list: [] }],
        [200, { contribution_values: [], destination_values: [] }],
        [
            200,
            {
                ...contributionColumnActiveRsp1,
                id_existing_persistent: 'display_txt'
            }
        ],
        [200, { contribution_values: [], destination_values: [] }],
        [
            200,
            {
                ...contributionColumnActiveRsp1,
                discard: true
            }
        ],
        [200, { contribution_values: [], destination_values: [] }]
    ])
}
