import { render, RenderOptions } from '@testing-library/react'
import {
    newNotificationManager,
    NotificationManager,
    notificationReducer
} from '../util/notification/slice'
import { newUserState, UserState } from './state'
import { Mock } from 'vitest'
import { userSlice } from './slice'
import { configureStore } from '@reduxjs/toolkit'
import { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { wait } from '@testing-library/user-event/dist/cjs/utils/index.js'

export const nameSshKey = 'ssh key name',
    typeSshKey = 'sshKeyType',
    idSshKey = 'ssh-key-id',
    nameSshKey1 = 'ssh key name 1',
    typeSshKey1 = 'sshKeyType1',
    idSshKey1 = 'ssh-key-id-1',
    sshKeyApi = {
        id_persistent: idSshKey,
        name: nameSshKey,
        type: typeSshKey
    },
    sshKeyApi1 = {
        id_persistent: idSshKey1,
        name: nameSshKey1,
        type: typeSshKey1
    },
    sshKeyListApi = { key_list: [sshKeyApi, sshKeyApi1] },
    noKeyApiResponse = { key_list: [] }

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: {
        notification: NotificationManager
        user: UserState
    }
}
export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: Mock,
    {
        preloadedState = {
            notification: newNotificationManager({}),
            user: newUserState({})
        },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: {
            notification: notificationReducer,
            user: userSlice.reducer
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
