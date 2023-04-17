/* eslint-disable @typescript-eslint/no-explicit-any */

import { useLogin } from '../hooks'
import { useThunkReducer } from '../../util/state'
import { UserState } from '../state'
import { LoginAction, RefreshAction, RegistrationAction } from '../async_actions'
import { RegistrationErrorClearAction } from '../actions'
import { LoginErrorClearAction } from '../actions'
import { ToggleRegistrationAction } from '../actions'

jest.mock('../../util/state', () => {
    const original = jest.requireActual('../../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn()
    }
})

const testUrl = 'http://test.url'
test('login cancels early', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new UserState({ isLoggingIn: true }),
        dispatch
    ])
    const { loginCallback } = useLogin(testUrl)
    loginCallback('user', 'password')
    // expect(dispatch.mock.calls).toEqual([])
    expect(dispatch.mock.calls).toEqual([])
})

test('handles login', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([new UserState({}), dispatch])
    const { loginCallback } = useLogin(testUrl)
    loginCallback('user', 'password')
    expect(dispatch.mock.calls).toEqual([
        [new LoginAction(testUrl, 'user', 'password')]
    ])
})

test('unset login rror', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([new UserState({}), dispatch])
    const { clearLoginErrorCallback } = useLogin(testUrl)
    clearLoginErrorCallback()
    expect(dispatch.mock.calls).toEqual([[new LoginErrorClearAction()]])
})

test('handles refresh', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([new UserState({}), dispatch])
    const { refreshCallback } = useLogin(testUrl)
    refreshCallback()
    expect(dispatch.mock.calls).toEqual([[new RefreshAction(testUrl)]])
})

test('register cancels early', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new UserState({ isRegistering: true }),
        dispatch
    ])
    const { registrationCallback } = useLogin(testUrl)
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
    const { registrationCallback } = useLogin(testUrl)
    registrationCallback({
        userName: 'username',
        namesPersonal: 'names personal',
        email: 'mail@test.url',
        password: 'password'
    })
    expect(dispatch.mock.calls).toEqual([
        [
            new RegistrationAction({
                apiPath: testUrl,
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
    const { clearRegistrationErrorCallback } = useLogin(testUrl)
    clearRegistrationErrorCallback()
    expect(dispatch.mock.calls).toEqual([[new RegistrationErrorClearAction()]])
})

test('can toggle registration', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([new UserState({}), dispatch])
    const { toggleRegistrationCallback } = useLogin(testUrl)
    toggleRegistrationCallback()
    expect(dispatch.mock.calls).toEqual([[new ToggleRegistrationAction()]])
})
