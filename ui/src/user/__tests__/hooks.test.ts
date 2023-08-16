/* eslint-disable @typescript-eslint/no-explicit-any */

import { useLogin } from '../hooks'
import { useThunkReducer } from '../../util/state'
import { UserInfo, UserState } from '../state'
import { LoginAction, RefreshAction, RegistrationAction } from '../async_actions'
import { LoginSuccessAction, RegistrationErrorClearAction } from '../actions'
import { LoginErrorClearAction } from '../actions'
import { ToggleRegistrationAction } from '../actions'

jest.mock('../../util/state', () => {
    const original = jest.requireActual('../../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn()
    }
})

test('login cancels early', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new UserState({ isLoggingIn: true }),
        dispatch
    ])
    const { loginCallback } = useLogin()
    loginCallback('user', 'password')
    // expect(dispatch.mock.calls).toEqual([])
    expect(dispatch.mock.calls).toEqual([])
})

test('handles login', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([new UserState({}), dispatch])
    const { loginCallback } = useLogin()
    loginCallback('user', 'password')
    expect(dispatch.mock.calls).toEqual([[new LoginAction('user', 'password')]])
})

test('unset login rror', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([new UserState({}), dispatch])
    const { clearLoginErrorCallback } = useLogin()
    clearLoginErrorCallback()
    expect(dispatch.mock.calls).toEqual([[new LoginErrorClearAction()]])
})

test('handles refresh', async () => {
    const dispatch = jest.fn()
    const userInfo = new UserInfo({
        userName: 'user test',
        idPersistent: 'id-user-test',
        namesPersonal: 'name test',
        columns: [],
        email: 'mail@test.org'
    })
    dispatch.mockImplementation(() => Promise.resolve(userInfo))
    ;(useThunkReducer as jest.Mock).mockReturnValue([new UserState({}), dispatch])
    const { refreshCallback } = useLogin()
    refreshCallback()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(dispatch.mock.calls).toEqual([
        [new RefreshAction(true)],
        [new LoginSuccessAction(userInfo)]
    ])
})

test('register cancels early', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new UserState({ isRegistering: true }),
        dispatch
    ])
    const { registrationCallback } = useLogin()
    registrationCallback({
        userName: 'username',
        namesPersonal: 'names personal',
        email: 'mail@test.url',
        password: 'password'
    })
    expect(dispatch.mock.calls).toEqual([])
})

test('handles registration', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([new UserState({}), dispatch])
    const { registrationCallback } = useLogin()
    registrationCallback({
        userName: 'username',
        namesPersonal: 'names personal',
        email: 'mail@test.url',
        password: 'password'
    })
    expect(dispatch.mock.calls).toEqual([
        [
            new RegistrationAction({
                userName: 'username',
                email: 'mail@test.url',
                namesPersonal: 'names personal',
                password: 'password'
            })
        ]
    ])
})

test('unset registration error', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([new UserState({}), dispatch])
    const { clearRegistrationErrorCallback } = useLogin()
    clearRegistrationErrorCallback()
    expect(dispatch.mock.calls).toEqual([[new RegistrationErrorClearAction()]])
})

test('can toggle registration', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([new UserState({}), dispatch])
    const { toggleRegistrationCallback } = useLogin()
    toggleRegistrationCallback()
    expect(dispatch.mock.calls).toEqual([[new ToggleRegistrationAction()]])
})
