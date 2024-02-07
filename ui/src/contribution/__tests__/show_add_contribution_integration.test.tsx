/**
 * @jest-environment jsdom
 */

import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import { ContributionState, contributionSlice, newContributionState } from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ContributionList } from '../components'
jest.mock('react-router-dom', () => {
    return { useNavigate: jest.fn() }
})
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contribution: ContributionState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = {
            contribution: newContributionState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contribution: contributionSlice.reducer
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

test('show modal', async () => {
    const fetchMock = jest.fn()
    addResponseSequence(fetchMock, [[200, { contributions: [] }]])
    const { store } = renderWithProviders(<ContributionList />, fetchMock)
    await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: 'Upload CSV' })
        uploadButton.click()
    })
    await waitFor(() => {
        screen.getByRole('form')
    })
    expect(store.getState().contribution.showAddContribution).toBeTruthy()
    const closeButton = screen.getByRole('button', { name: 'Close' })
    closeButton.click()
    await waitFor(() => {
        expect(screen.queryByRole('form')).toBeNull()
    })
    expect(store.getState().contribution.showAddContribution).toBeFalsy()
})
