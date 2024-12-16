/**
 * @jest-environment jsdom
 */

import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import {
    NotificationManager,
    NotificationType,
    newNotification,
    notificationReducer
} from '../../../util/notification/slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { PreviewConnector } from '../components'
import { useNavigate } from 'react-router-dom'
import {
    ColumnDefinitionsContributionState,
    newColumnDefinitionsContributionState,
    newValuePreview
} from '../state'
import { newRemote } from '../../../util/state'
import { contributionColumnDefinitionSlice } from '../slice'

jest.mock('react-router-dom', () => {
    const navigateMock = jest.fn()
    return { useNavigate: jest.fn().mockReturnValue(navigateMock) }
})
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contributionColumnDefinition: ColumnDefinitionsContributionState
        notification: NotificationManager
    }
}

beforeEach(() => {
    ;(useNavigate() as jest.Mock).mockRestore()
})

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            contributionColumnDefinition: newColumnDefinitionsContributionState({
                columns: newRemote(undefined)
            }),
            notification: { notificationList: [], notificationMap: {} }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contributionColumnDefinition: contributionColumnDefinitionSlice.reducer,
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

const idContributionPersistent = 'id-contribution'
const idColumnPersistent = 'id-column'
const idDestinationPersistent = 'id-destination'

test('get preview success', async () => {
    const contributionValue = 'value'
    const contributionValue1 = 'value 1'
    const destinationValue = 'value destination'
    const destinationValue1 = 'value destination1'
    const destinationValue2 = 'value destination2'
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [
        [
            200,
            {
                contribution_values: [contributionValue, contributionValue1],
                destination_values: [
                    destinationValue,
                    destinationValue1,
                    destinationValue2
                ]
            }
        ]
    ])
    const { store } = renderWithProviders(
        <PreviewConnector
            idContributionPersistent={idContributionPersistent}
            idColumnPersistent={idColumnPersistent}
            idExistingPersistent={idDestinationPersistent}
        />,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText(contributionValue)
        screen.getByText(contributionValue1)
        screen.getByText(destinationValue)
        screen.getByText(destinationValue1)
        screen.getByText(destinationValue2)
    })
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1/api/contributions/' +
                `${idContributionPersistent}/preview/${idColumnPersistent}`,
            { credentials: 'include' }
        ]
    ])
    expect(store.getState().contributionColumnDefinition).toEqual(
        newColumnDefinitionsContributionState({
            preview: newRemote(
                newValuePreview(
                    [contributionValue, contributionValue1],
                    [destinationValue, destinationValue1, destinationValue2]
                )
            )
        })
    )
})

test('get preview error', async () => {
    const testError = 'Could not get preview'
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [
        [
            500,
            {
                msg: testError
            }
        ]
    ])
    const { store } = renderWithProviders(
        <PreviewConnector
            idContributionPersistent={idContributionPersistent}
            idColumnPersistent={idColumnPersistent}
            idExistingPersistent={idDestinationPersistent}
        />,
        fetchMock
    )
    await waitFor(() => {
        const state = store.getState()
        expect(state.contributionColumnDefinition).toEqual(
            newColumnDefinitionsContributionState({})
        )
        expect(state.notification.notificationList).toEqual([
            newNotification({
                type: NotificationType.Error,
                msg: testError,
                id: expect.anything()
            })
        ])
    })
})
