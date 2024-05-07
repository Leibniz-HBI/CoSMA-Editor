/**
 * @jest-environment jsdom
 */

import { RenderOptions, render, screen, waitFor } from '@testing-library/react'
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
import {
    NotificationManager,
    NotificationType,
    notificationReducer
} from '../../../util/notification/slice'
import { useNavigate } from 'react-router-dom'

jest.mock('react-router-dom', () => {
    const loaderMock = jest.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    const navigateMock = jest.fn()
    return {
        useLoaderData: loaderMock,
        useNavigate: jest.fn().mockReturnValue(navigateMock)
    }
})

beforeEach(() => {
    ;(useNavigate() as jest.Mock).mockClear()
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contributionColumnDefinition: ColumnDefinitionsContributionState
        contribution: ContributionState
        tagSelection: TagSelectionState
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
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
            tagSelection: newTagSelectionState({}),
            notification: { notificationList: [], notificationMap: {} }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contributionColumnDefinition: contributionColumnDefinitionSlice.reducer,
            contribution: contributionSlice.reducer,
            tagSelection: tagSelectionSlice.reducer,
            notification: notificationReducer
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
function addResponseSequence(mock: jest.Mock, responses: [number, unknown][]) {
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        mock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as jest.Mock
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

function initialResponseSequence(fetchMock: jest.Mock) {
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
        [200, { tag_definitions: [] }]
    ])
}

test('finish success', async () => {
    const fetchMock = jest.fn()
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
    const { store } = renderWithProviders(<ColumnDefinitionStep />, fetchMock)
    let button: HTMLElement | undefined
    await waitFor(() => {
        expect(fetchMock.mock.calls.length).toEqual(3)
        button = screen.getByRole('button', { name: /finalize column assignment/i })
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
    })
    expect(fetchMock).toHaveBeenCalledWith(
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/column_assignment_complete`,
        { method: 'POST', credentials: 'include' }
    )
    expect(fetchMock).toHaveBeenCalledWith(
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}`,
        { credentials: 'include' }
    )
    expect((useNavigate() as jest.Mock).mock.calls).toEqual([
        ['/contribute/id-contribution-test/entities']
    ])
})
test('finish error', async () => {
    const fetchMock = jest.fn()
    initialResponseSequence(fetchMock)
    const errorMsg = 'Not Complete'
    addResponseSequence(fetchMock, [
        [500, { msg: errorMsg }],
        [200, { tag_definitions: [] }]
    ])
    const { store } = renderWithProviders(<ColumnDefinitionStep />, fetchMock)
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
    expect(fetchMock).toHaveBeenCalledWith(
        `http://127.0.0.1:8000/cosmae/api/contributions/${idContribution}/column_assignment_complete`,
        { method: 'POST', credentials: 'include' }
    )
    expect((useNavigate() as jest.Mock).mock.calls).toEqual([])
})
