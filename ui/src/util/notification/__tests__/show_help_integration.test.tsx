/**
 * @jest-environment jsdom
 */
import {
    RenderOptions,
    render,
    waitFor,
    screen,
    getByRole
} from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import {
    NotificationManager,
    newNotificationManager,
    notificationReducer
} from '../slice'
import { HelpButton, HelpModal } from '../components'
import { useLocation } from 'react-router-dom'

jest.mock('react-router-dom', () => {
    const useLocationCallback = jest.fn()
    return { useLocation: useLocationCallback }
})

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
    }
}

export function renderWithProviders(
    ui: React.ReactElement,
    {
        preloadedState = {
            notification: newNotificationManager({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            notification: notificationReducer
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({}),
        preloadedState
    })
    function Wrapper({ children }: PropsWithChildren<object>): JSX.Element {
        return <Provider store={store}>{children}</Provider>
    }

    // Return an object with the store and all of RTL's query functions
    return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
function TestHelpComponent() {
    return (
        <>
            <HelpButton />
            <HelpModal />
        </>
    )
}

test('show missing help', async () => {
    ;(useLocation as unknown as jest.Mock).mockReturnValue({
        pathname: '/some/unknown/path'
    })
    const { store } = renderWithProviders(<TestHelpComponent />)
    const button = screen.getByRole('button')
    expect(screen.queryByRole('dialog')).toBeNull()
    button.click()
    await waitFor(() => {
        expect(store.getState().notification.helpPath).not.toBeUndefined()
        const dialog = screen.getByRole('dialog')
        screen.getByText('Missing Help')
        const closeButton = getByRole(dialog, 'button')
        closeButton.click()
    })
    await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
    })
})

test('show existing help with variable', async () => {
    ;(useLocation as unknown as jest.Mock).mockReturnValue({
        pathname: '/contribute/id/entities'
    })
    const { store } = renderWithProviders(<TestHelpComponent />)
    const button = screen.getByRole('button')
    expect(screen.queryByRole('dialog')).toBeNull()
    button.click()
    await waitFor(() => {
        expect(store.getState().notification.helpPath).not.toBeUndefined()
        const dialog = screen.getByRole('dialog')
        screen.getByText('Match Entities')
        const closeButton = getByRole(dialog, 'button')
        closeButton.click()
    })
    await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
    })
})
