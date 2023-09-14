/**
 * @jest-environment jsdom
 */
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { PropsWithChildren } from 'react'
import { RenderOptions, render, screen, waitFor } from '@testing-library/react'
import { UserPermissionGroup, UserState, mkUserState } from '../../state'
import userReducer from '../../slice'
import { LoginProvider } from '../provider'
import userEvent from '@testing-library/user-event'
import { newErrorState } from '../../../util/error/slice'
import { newRemote } from '../../../util/state'
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    preloadedState?: { user: UserState }
}

const idErrorTest = 'id-error-test'
jest.mock('uuid', () => {
    return {
        v4: () => idErrorTest
    }
})

export function renderWithProviders(
    ui: React.ReactElement,
    fetchMock: jest.Mock,
    {
        preloadedState = { user: mkUserState({}) },
        ...renderOptions
    }: ExtendedRenderOptions = {}
) {
    const store = configureStore({
        reducer: { user: userReducer },
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

const userNameTest = 'test_user'
const emailTest = 'me@test.url'
const passwordTest = 'pA$sw0rd-1234'
const namesPersonalTest = 'names personal test'
const testError = 'test error message'
const idPersistentTest = 'id-user-test'
const userInfoApi = {
    user_name: userNameTest,
    names_personal: namesPersonalTest,
    email: emailTest,
    names_family: '',
    tag_definition_list: [],
    id_persistent: idPersistentTest,
    permission_group: 'CONTRIBUTOR'
}
const userInfoUi = mkUserState({
    userInfo: {
        userName: userNameTest,
        namesPersonal: namesPersonalTest,
        email: emailTest,
        namesFamily: '',
        columns: [],
        idPersistent: idPersistentTest,
        permissionGroup: UserPermissionGroup.CONTRIBUTOR
    }
})
describe('login', () => {
    async function performLogin(container: HTMLElement) {
        const user = userEvent.setup()
        const textInput = screen.getByRole('textbox')
        const passwordInput = screen.getByLabelText('Password')
        const buttons = container.getElementsByTagName('button')
        await user.type(textInput, 'username')
        await user.type(passwordInput, 'password')
        const loginButton = buttons[1]
        expect(loginButton.textContent).toEqual('Login')
        await user.click(loginButton)
    }
    test('login on successful refresh', async () => {
        const fetchMock = jest.fn()
        addResponseSequence(fetchMock, [[200, userInfoApi]])
        const { store } = renderWithProviders(
            <LoginProvider body={<span>You are logged in</span>}></LoginProvider>,
            fetchMock
        )
        await waitFor(async () => {
            expect(await screen.getByText('You are logged in')).toBeDefined()
        })
        expect(store.getState().user).toEqual(userInfoUi)
    })
    test('successful login', async () => {
        const fetchMock = jest.fn()
        addResponseSequence(fetchMock, [
            [401, { msg: 'not authenticated' }],
            [200, userInfoApi]
        ])
        const { store, container } = renderWithProviders(
            <LoginProvider body={<span>You are logged in</span>}></LoginProvider>,
            fetchMock
        )
        await performLogin(container)
        await waitFor(async () => {
            expect(await screen.getByText('You are logged in')).toBeDefined()
        })
        expect(store.getState().user).toEqual(userInfoUi)
    })
    test('login error with message', async () => {
        const fetchMock = jest.fn()
        addResponseSequence(fetchMock, [
            [401, { msg: 'not authenticated' }],
            [400, { msg: testError }]
        ])
        const { store, container } = renderWithProviders(
            <LoginProvider body={<span>You are logged in</span>}></LoginProvider>,
            fetchMock
        )
        performLogin(container)
        await waitFor(async () => {
            expect(await screen.queryByText('You are logged in')).toBeNull()
            await screen.getByText(testError)
        })
        expect(store.getState()).toEqual({
            user: mkUserState({
                loginErrorState: newErrorState(testError, idErrorTest)
            })
        })
    })
    test('login error without message', async () => {
        const fetchMock = jest.fn()
        addResponseSequence(fetchMock, [
            [401, { msg: 'not authenticated' }],
            [400, {}]
        ])
        const { store, container } = renderWithProviders(
            <LoginProvider body={<span>You are logged in</span>}></LoginProvider>,
            fetchMock
        )
        performLogin(container)
        await waitFor(async () => {
            expect(store.getState()).toEqual({
                user: mkUserState({
                    loginErrorState: newErrorState('Unknown error', idErrorTest)
                })
            })
        })
        await waitFor(async () => {
            expect(await screen.queryByText('You are logged in')).toBeNull()
            await screen.getByText('Unknown error')
        })
    })
})

describe('registration', () => {
    async function performRegistration(container: HTMLElement) {
        const user = userEvent.setup()
        const registrationButton = container.getElementsByTagName('button')[0]
        expect(registrationButton.textContent).toEqual('Registration')
        // await act(async () => {
        await user.click(registrationButton)
        // })
        const textInputs = await waitFor(() => {
            const textInputs = screen.getAllByRole('textbox')
            expect(textInputs.length).toEqual(4)
            return textInputs
        })
        await user.type(textInputs[0], 'username')
        await user.type(textInputs[1], 'mail@test.url')
        await user.type(textInputs[2], 'names personal')
        const passwordInput = screen.getByLabelText('Password')
        await user.type(passwordInput, passwordTest)
        const repeatPasswordInput = screen.getByLabelText('Repeat password')
        await user.type(repeatPasswordInput, passwordTest)
        const registerButton = container.getElementsByTagName('button')[1]
        expect(registerButton.textContent).toEqual('Register')
        await user.click(registerButton)
    }

    test('success', async () => {
        const fetchMock = jest.fn()
        addResponseSequence(fetchMock, [
            [401, { msg: 'not authenticated' }],
            [200, userInfoApi]
        ])
        const { store, container } = renderWithProviders(
            <LoginProvider body={<span>You are logged in</span>}></LoginProvider>,
            fetchMock
        )
        await performRegistration(container)
        await waitFor(async () => {
            screen.getByText('You are logged in')
        })
        expect(store.getState().user).toEqual({ ...userInfoUi, showRegistration: true })
    })
    test('error', async () => {
        const fetchMock = jest.fn()
        addResponseSequence(fetchMock, [
            [401, { msg: 'not authenticated' }],
            [400, { msg: 'registration error' }]
        ])
        const { store, container } = renderWithProviders(
            <LoginProvider body={<span>You are logged in</span>}></LoginProvider>,
            fetchMock
        )
        await performRegistration(container)
        await waitFor(async () => {
            expect(screen.queryByText('You are logged in')).toBeNull()
            screen.getByText('registration error')
        })
        expect(store.getState().user).toEqual({
            userInfo: undefined,
            showRegistration: true,
            registrationErrorState: newErrorState('registration error', idErrorTest),
            isLoggingIn: false,
            isRefreshing: false,
            isRegistering: false,
            loginErrorState: undefined,
            userSearchResults: newRemote([])
        })
    })
    test('error without message', async () => {
        const fetchMock = jest.fn()
        addResponseSequence(fetchMock, [
            [401, { msg: 'not authenticated' }],
            [400, {}]
        ])
        const { store, container } = renderWithProviders(
            <LoginProvider body={<span>You are logged in</span>}></LoginProvider>,
            fetchMock
        )
        await performRegistration(container)
        await waitFor(async () => {
            expect(screen.queryByText('You are logged in')).toBeNull()
            screen.getByText('Unknown error')
        })
        expect(store.getState().user).toEqual({
            userInfo: undefined,
            showRegistration: true,
            registrationErrorState: newErrorState('Unknown error', idErrorTest),
            isLoggingIn: false,
            isRefreshing: false,
            isRegistering: false,
            loginErrorState: undefined,
            userSearchResults: newRemote([])
        })
    })
})
