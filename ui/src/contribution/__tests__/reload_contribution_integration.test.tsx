/**
 * @jest-environment jsdom
 */

import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import { ContributionState, contributionSlice, newContributionState } from '../slice'
import { NotificationManager, notificationReducer } from '../../util/notification/slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ContributionStepper } from '../components'

jest.mock('react-router-dom', () => {
    const mockNavigate = jest.fn()
    return {
        useNavigate: jest.fn().mockReturnValue(mockNavigate),
        useLoaderData: jest.fn().mockReturnValue('id-test-1')
    }
})
jest.mock('../../config', () => {
    return { ...jest.requireActual('../../config'), secondDelay: 100 }
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contribution: ContributionState
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            contribution: newContributionState({}),
            notification: { notificationList: [], notificationMap: {} }
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contribution: contributionSlice.reducer,
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
const nameTest1 = 'contribution test 1'
const descriptionTest1 = 'another contribution for tests'
const idTest1 = 'id-test-1'
const authorTest1 = 'author test 1'
const contributionResponse1 = {
    name: nameTest1,
    description: descriptionTest1,
    id_persistent: idTest1,
    has_header: true,
    state: 'COLUMNS_ASSIGNED',
    author: authorTest1
}
test('reloads automatically', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [
        [200, { ...contributionResponse1 }],
        [200, { ...contributionResponse1 }],
        [200, { ...contributionResponse1, state: 'VALUES_EXTRACTED' }]
    ])
    const testBodyText = 'body of contribution step for tests'
    renderWithProviders(
        <ContributionStepper selectedIdx={2}>
            <div>{testBodyText}</div>
        </ContributionStepper>,
        fetchMock
    )
    await waitFor(() => {
        screen.getByText(/not yet available/i)
    })
    await waitFor(
        () => {
            expect(fetchMock.mock.calls.length).toEqual(3)
            for (let idx = 0; idx < 3; ++idx) {
                expect(fetchMock.mock.calls[idx]).toEqual([
                    'http://127.0.0.1:8000/cosmae/api/contributions/id-test-1',
                    { credentials: 'include' }
                ])
            }
        },
        { timeout: 2000 }
    )
    screen.getByText(testBodyText)
})
