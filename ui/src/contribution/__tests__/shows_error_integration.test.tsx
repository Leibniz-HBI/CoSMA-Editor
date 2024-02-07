/**
 * @jest-environment jsdom
 */

import { RenderOptions, render, waitFor } from '@testing-library/react'
import {
    ColumnDefinitionsContributionState,
    newColumnDefinitionsContributionState
} from '../columns/state'
import { newRemote } from '../../util/state'
import { configureStore } from '@reduxjs/toolkit'
import { contributionColumnDefinitionSlice } from '../columns/slice'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ColumnDefinitionStep } from '../columns/components'
import { TagSelectionState, newTagSelectionState } from '../../column_menu/state'
import { tagSelectionSlice } from '../../column_menu/slice'
import {
    NotificationManager,
    NotificationType,
    notificationReducer
} from '../../util/notification/slice'
import { ContributionState, contributionSlice, newContributionState } from '../slice'
import { ContributionStepper } from '../components'

jest.mock('react-router-dom', () => {
    const loaderMock = jest.fn()
    loaderMock.mockReturnValue('id-contribution-test')
    return { useLoaderData: loaderMock, useNavigate: jest.fn() }
})
jest.mock('uuid', () => {
    return {
        v4: () => 'id-error-test'
    }
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
                selectedContribution: newRemote(undefined)
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
const errorMsg = 'Test Error'
const errorDetails = 'Description of a test error'
const authorTest = 'author test'
const contributionRsp = {
    name: 'contribution test',
    id_persistent: idContribution,
    description: 'a contribution for tests',
    step: 'COLUMNS_EXTRACTED',
    has_header: true,
    author: authorTest,
    error_msg: errorMsg,
    error_details: errorDetails
}
test('sets error', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [[200, contributionRsp]])
    const { store } = renderWithProviders(
        <ContributionStepper selectedIdx={0} />,
        fetchMock
    )
    const expectedMessage = `${errorMsg}\n${errorDetails}`
    await waitFor(() => {
        const state = store.getState()
        expect(state.notification).toEqual({
            notificationList: [
                {
                    id: 'id-error-test',
                    msg: expectedMessage,
                    type: NotificationType.Error
                }
            ],
            notificationMap: { 'id-error-test': 0 }
        })
    })
})
