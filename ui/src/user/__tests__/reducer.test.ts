import { userReducer } from '../reducer'
import { UserInfo, UserState } from '../state'
import {
    LoginErrorAction,
    LoginErrorClearAction,
    LoginStartAction,
    LoginSuccessAction,
    LogoutAction,
    RefreshDeniedAction,
    RefreshStartAction,
    RegistrationErrorAction,
    RegistrationErrorClearAction,
    RegistrationStartAction,
    ToggleRegistrationAction
} from '../actions'
import { ErrorState } from '../../util/error'

describe('user reducher', () => {
    const userNameTest = 'userTest'
    const emailTest = 'me@test.url'
    const namesPersonalTest = 'names personal test'
    const testError = 'test error message'
    test('successfull login', () => {
        const initialState = new UserState({})
        const expectedState = new UserState({
            userInfo: new UserInfo({
                userName: userNameTest,
                email: emailTest,
                namesPersonal: namesPersonalTest
            })
        })
        const endState = userReducer(
            initialState,
            new LoginSuccessAction(
                new UserInfo({
                    userName: userNameTest,
                    email: emailTest,
                    namesPersonal: namesPersonalTest
                })
            )
        )
        expect(endState).toEqual(expectedState)
    })
    test('loginError', () => {
        const initialState = new UserState({ isLoggingIn: true })
        const expectedState = new UserState({
            loginErrorState: new ErrorState(testError)
        })
        const endState = userReducer(initialState, new LoginErrorAction(testError))
        expect(endState).toEqual(expectedState)
    })
    test('loginStart', () => {
        const initialState = new UserState({})
        const expectedState = new UserState({
            isLoggingIn: true
        })
        const endState = userReducer(initialState, new LoginStartAction())
        expect(endState).toEqual(expectedState)
    })
    test('clear login error', () => {
        const initialState = new UserState({
            loginErrorState: new ErrorState(testError)
        })
        const expectedState = new UserState({})
        const endState = userReducer(initialState, new LoginErrorClearAction())
        expect(endState).toEqual(expectedState)
    })
    test('switch to registration', () => {
        const initialState = new UserState({})
        const expectedState = new UserState({ showRegistration: true })
        const endState = userReducer(initialState, new ToggleRegistrationAction())
        expect(endState).toEqual(expectedState)
    })
    test('switch  from registration', () => {
        const initialState = new UserState({ showRegistration: true })
        const expectedState = new UserState({})
        const endState = userReducer(initialState, new ToggleRegistrationAction())
        expect(endState).toEqual(expectedState)
    })
    test('registrationError', () => {
        const initialState = new UserState({ isRegistering: true })
        const expectedState = new UserState({
            registrationErrorState: new ErrorState(testError)
        })
        const endState = userReducer(
            initialState,
            new RegistrationErrorAction(testError)
        )
        expect(endState).toEqual(expectedState)
    })
    test('registrationStart', () => {
        const initialState = new UserState({})
        const expectedState = new UserState({
            isRegistering: true
        })
        const endState = userReducer(initialState, new RegistrationStartAction())
        expect(endState).toEqual(expectedState)
    })
    test('clear registration error', () => {
        const initialState = new UserState({
            registrationErrorState: new ErrorState(testError)
        })
        const expectedState = new UserState({})
        const endState = userReducer(initialState, new RegistrationErrorClearAction())
        expect(endState).toEqual(expectedState)
    })
    test('logout', () => {
        const initialState = new UserState({
            userInfo: new UserInfo({
                userName: userNameTest,
                email: emailTest,
                namesPersonal: namesPersonalTest
            })
        })
        const expectedState = new UserState({})
        const endState = userReducer(initialState, new LogoutAction())
        expect(endState).toEqual(expectedState)
    })
    test('refresh start', () => {
        const initialState = new UserState({})
        const expectedState = new UserState({ isRefreshing: true })
        const endState = userReducer(initialState, new RefreshStartAction())
        expect(endState).toEqual(expectedState)
    })
    test('refresh error', () => {
        const initialState = new UserState({
            userInfo: new UserInfo({
                userName: userNameTest,
                email: emailTest,
                namesPersonal: namesPersonalTest
            })
        })
        const expectedState = new UserState({})
        const endState = userReducer(initialState, new RefreshDeniedAction())
        expect(endState).toEqual(expectedState)
    })
})
