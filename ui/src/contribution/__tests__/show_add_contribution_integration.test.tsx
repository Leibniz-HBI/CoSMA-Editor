/**
 * @vitest-environment jsdom
 */

import { RenderOptions, render, waitFor, screen } from '@testing-library/react'
import { ContributionState, contributionSlice, newContributionState } from '../slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { ContributionList } from '../components'
import { EditSessionState, newEditSessionState } from '../../session/state'
import { editSessionReducer } from '../../session/slice'
import {vi, Mock} from 'vitest'
vi.mock('react-router-dom', () => {
    return { useNavigate: vi.fn() }
})
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        contribution: ContributionState
        editSession: EditSessionState
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            contribution: newContributionState({}),
            editSession: newEditSessionState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            contribution: contributionSlice.reducer,
            editSession: editSessionReducer
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

test('show modal', async () => {
    const fetchMock = vi.fn()
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
