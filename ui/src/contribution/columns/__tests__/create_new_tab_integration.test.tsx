/**
 * @vitest-environment jsdom
 */

import { getByRole, screen, waitFor } from '@testing-library/react'
import { newColumnDefinitionsContributionState } from '../state'
import { newRemote } from '../../../util/state'
import { ColumnDefinitionStep } from '../components'
import { ContributionStep, newContribution } from '../../state'
import userEvent from '@testing-library/user-event'
import { newContributionState } from '../../slice'
import { vi, Mock } from 'vitest'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { addResponseSequence, expectFetchCall } from '../../../util/tests/response'

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
const nameColumn0 = 'column def 0'

function initialResponseSequence(fetchMock: Mock) {
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
        [200, { column_list: [] }]
    ])
}

test('create, select and assign column', async () => {
    const fetchMock = vi.fn()
    initialResponseSequence(fetchMock)
    const columnJson = {
        id_persistent: idColumn0,
        name_path: [nameColumn0],
        name: nameColumn0,
        curated: true,
        version: 0,
        type: 'STRING'
    }
    addResponseSequence(fetchMock, [
        [200, { contribution_values: [], destination_values: [] }],
        [
            200,
            {
                column_list: [columnJson]
            }
        ],
        [
            200,
            {
                column_list: [columnJson]
            }
        ],
        [
            200,
            {
                column_list: []
            }
        ],
        [200, { ...contributionColumnActiveRsp1, id_existing_persistent: idColumn0 }],
        [200, { contribution_values: [], destination_values: [] }]
    ])
    const { store } = renderWithProviders(
        <ColumnDefinitionStep />,
        fetchMock,
        initialState
    )
    const user = userEvent.setup()
    let title2: HTMLElement | undefined
    await waitFor(() => {
        title2 = screen.getByText(contributionColumnActiveRsp1.name)
    })
    if (title2) {
        await user.click(title2)
    }
    await waitFor(() => {
        expect(
            store.getState().contributionColumnDefinition.selectedColumnDefinition.value
                ?.idPersistent
        ).toEqual(contributionColumnActiveRsp1.id_persistent)
        expect(fetchMock.mock.calls.length).toEqual(4)
    })
    const createMenuButton = screen.getByRole('button', { name: /Create new column/i })
    await user.click(createMenuButton)
    await waitFor(() => {
        screen.getAllByText('Name')
    })
    const textBox = screen.getAllByRole('textbox')[0]
    await user.type(textBox, nameColumn0)
    const stringLabel = screen.getByText('string')
    const stringRadio = getByRole(
        // eslint-disable-next-line  @typescript-eslint/no-non-null-asserted-optional-chain
        stringLabel.parentElement?.parentElement!,
        'radio'
    )
    // const stringRadio = radioButtons[1]
    await user.click(stringRadio)
    const createButton = screen.getByRole('button', { name: 'Create' })
    await user.click(createButton)
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    expect(fetchMock.mock.calls.length).toEqual(7)
    const columnLabel = await screen.findByText(nameColumn0)
    const columnEntry =
        columnLabel.parentElement?.parentElement?.parentElement?.parentElement
            ?.parentElement
    const radioButton = getByRole(columnEntry as HTMLElement, 'button', {
        name: /select/i
    })
    radioButton.click()
    await waitFor(() => {
        expect(
            store.getState().contributionColumnDefinition.selectedColumnDefinition.value
                ?.idExistingPersistent
        ).toEqual(idColumn0)
    })
    await expectFetchCall(fetchMock.mock.calls.at(-2), [
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/columns/${contributionColumnActiveRsp1.id_persistent}`,
        {
            method: 'PATCH',
            credentials: 'include',
            body: JSON.stringify({ id_existing_persistent: idColumn0 })
        }
    ])
    await expectFetchCall(fetchMock.mock.calls.at(-1), [
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/preview/id-active-2`,
        { credentials: 'include' }
    ])
}, 10000)

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
