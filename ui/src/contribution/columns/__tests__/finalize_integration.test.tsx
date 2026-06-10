/**
 * @vitest-environment jsdom
 */

import { screen, waitFor } from '@testing-library/react'
import { newColumnDefinitionsContributionState } from '../state'
import { newRemote } from '../../../util/state'
import { ColumnDefinitionStep } from '../components'
import { ContributionStep, newContribution } from '../../state'
import { newColumnSelectionState } from '../../../column_menu/state'
import { NotificationType } from '../../../util/notification/slice'
import { useNavigate } from 'react-router-dom'
import { vi, Mock } from 'vitest'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { addResponseSequence, expectFetchCall } from '../../../util/tests/response'
import { newContributionState } from '../../slice'

vi.mock('react-router-dom', () => {
    const loaderMock = vi.fn()
    loaderMock.mockReturnValue({
        idPersistent: 'id-contribution-test',
        stepData: 'id-active-0'
    })
    const navigateMock = vi.fn()
    return {
        useLoaderData: loaderMock,
        useNavigate: vi.fn().mockReturnValue(navigateMock)
    }
})

beforeEach(() => {
    ;(useNavigate() as Mock).mockClear()
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
const idColumn = 'id-column-test-0'
const nameColumn0 = 'column 0'

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
        [
            200,
            {
                column_list: [
                    {
                        id_persistent: idColumn,
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

test('finish success', async () => {
    const fetchMock = vi.fn()
    initialResponseSequence(fetchMock)
    addResponseSequence(fetchMock, [
        [200, {}],
        [
            200,
            {
                name: 'contribution test',
                id_persistent: idContribution,
                description: 'a contribution for tests',
                has_header: true,
                author: authorTest,
                state: 'COLUMNS_ASSIGNED'
            }
        ]
    ])
    const { store } = renderWithProviders(
        <ColumnDefinitionStep />,
        fetchMock,
        initialState
    )
    const button = await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(4)
        return screen.getByRole('button', { name: /finalize column assignment/i })
    })
    button?.click()
    await waitFor(() => {
        const notifications = store.getState().notification.notificationList
        expect(notifications.length).toEqual(1)
        const notification = notifications[0]
        expect(notification.type).toEqual(NotificationType.Success)
        expect(notification.msg).toEqual('Columns successfully assigned.')
    })
    await waitFor(() => {
        expect(store.getState().contribution.selectedContribution.value?.step).toEqual(
            ContributionStep.ColumnsAssigned
        )
        expect(fetchMock.mock.calls).toHaveLength(6)
    })
    await expectFetchCall(fetchMock.mock.calls.at(-2), [
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/column_assignment_complete`,
        { method: 'POST', credentials: 'include' }
    ])
    await expectFetchCall(fetchMock.mock.calls.at(-1), [
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}`,
        { credentials: 'include' }
    ])
    expect((useNavigate() as Mock).mock.calls).toEqual([
        ['/contribute/id-contribution-test/entities']
    ])
})
test('finish error', async () => {
    const fetchMock = vi.fn()
    initialResponseSequence(fetchMock)
    const errorMsg = 'Not Complete'
    addResponseSequence(fetchMock, [
        [500, { msg: errorMsg }],
        [200, { column_list: [] }]
    ])
    const { store } = renderWithProviders(
        <ColumnDefinitionStep />,
        fetchMock,
        initialState
    )
    let button: HTMLElement | undefined
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(4)
        button = screen.getByRole('button', { name: /finalize column assignment/i })
    })
    button?.click()
    await waitFor(() => {
        expect(
            screen.queryByRole('button', {
                name: /Column assignment successfully finalized/i
            })
        ).toBeNull()
        const notifications = store.getState().notification.notificationList
        expect(notifications.length).toEqual(1)
        const notification = notifications[0]
        expect(notification.type).toEqual(NotificationType.Error)
        expect(notification.msg).toEqual(errorMsg)
    })
    await expectFetchCall(fetchMock.mock.calls.at(-1), [
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/column_assignment_complete`,
        { method: 'POST', credentials: 'include' }
    ])
    expect((useNavigate() as Mock).mock.calls).toEqual([])
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
    }),
    columnSelection: newColumnSelectionState({}),
    notification: { notificationList: [], notificationMap: {} }
}
const initialState = { preloadedState }
