import {
    loginError,
    loginErrorClear,
    loginStart,
    loginSuccess,
    logout,
    refreshDenied,
    refreshStart,
    registrationError,
    registrationErrorClear,
    registrationStart,
    toggleRegistration,
    default as userReducer
} from '../slice'
import { UserInfo, UserPermissionGroup, mkUserState } from '../state'
import { ErrorState } from '../../util/error/slice'

describe('user reducer', () => {
    const userNameTest = 'userTest'
    const emailTest = 'me@test.url'
    const namesPersonalTest = 'names personal test'
    const testError = 'test error message'
    test('uses initial state', () => {
        expect(userReducer(undefined, { type: undefined })).toEqual({
            userInfo: undefined,
            isLoggingIn: false,
            isRefreshing: false,
            isRegistering: false,
            loginErrorState: undefined,
            registrationErrorState: undefined,
            showRegistration: false
        })
    })
    test('successful login', () => {
        const initialState = mkUserState({})
        const expectedState = mkUserState({
            userInfo: new UserInfo({
                userName: userNameTest,
                email: emailTest,
                namesPersonal: namesPersonalTest,
                idPersistent: 'idUserTest',
                permissionGroup: UserPermissionGroup.EDITOR
            })
        })
        const endState = userReducer(
            initialState,
            loginSuccess(
                new UserInfo({
                    userName: userNameTest,
                    email: emailTest,
                    namesPersonal: namesPersonalTest,
                    idPersistent: 'idUserTest',
                    permissionGroup: UserPermissionGroup.EDITOR
                })
            )
        )
        expect(endState).toEqual(expectedState)
    })
    test('loginError', () => {
        const initialState = mkUserState({ isLoggingIn: true })
        const expectedState = mkUserState({
            loginErrorState: new ErrorState(testError, undefined, 'id-error-test')
        })
        const endState = userReducer(
            initialState,
            loginError(new ErrorState(testError, undefined, 'id-error-test'))
        )
        expect(endState).toEqual(expectedState)
    })
    test('loginStart', () => {
        const initialState = mkUserState({})
        const expectedState = mkUserState({
            isLoggingIn: true
        })
        const endState = userReducer(initialState, loginStart())
        expect(endState).toEqual(expectedState)
    })
    test('clear login error', () => {
        const initialState = mkUserState({
            loginErrorState: new ErrorState(testError)
        })
        const expectedState = mkUserState({})
        const endState = userReducer(initialState, loginErrorClear())
        expect(endState).toEqual(expectedState)
    })
    test('switch to registration', () => {
        const initialState = mkUserState({})
        const expectedState = mkUserState({ showRegistration: true })
        const endState = userReducer(initialState, toggleRegistration())
        expect(endState).toEqual(expectedState)
    })
    test('switch  from registration', () => {
        const initialState = mkUserState({ showRegistration: true })
        const expectedState = mkUserState({})
        const endState = userReducer(initialState, toggleRegistration())
        expect(endState).toEqual(expectedState)
    })
    test('registrationError', () => {
        const initialState = mkUserState({ isRegistering: true })
        const expectedState = mkUserState({
            registrationErrorState: new ErrorState(
                testError,
                undefined,
                'id-error-test'
            )
        })
        const endState = userReducer(
            initialState,
            registrationError(new ErrorState(testError, undefined, 'id-error-test'))
        )
        expect(endState).toEqual(expectedState)
    })
    test('registrationStart', () => {
        const initialState = mkUserState({})
        const expectedState = mkUserState({
            isRegistering: true
        })
        const endState = userReducer(initialState, registrationStart())
        expect(endState).toEqual(expectedState)
    })
    test('clear registration error', () => {
        const initialState = mkUserState({
            registrationErrorState: new ErrorState(testError)
        })
        const expectedState = mkUserState({})
        const endState = userReducer(initialState, registrationErrorClear())
        expect(endState).toEqual(expectedState)
    })
    test('logout', () => {
        const initialState = mkUserState({
            userInfo: new UserInfo({
                userName: userNameTest,
                email: emailTest,
                namesPersonal: namesPersonalTest,
                idPersistent: 'idUserTest',
                permissionGroup: UserPermissionGroup.EDITOR
            })
        })
        const expectedState = mkUserState({})
        const endState = userReducer(initialState, logout())
        expect(endState).toEqual(expectedState)
    })
    test('refresh start', () => {
        const initialState = mkUserState({})
        const expectedState = mkUserState({ isRefreshing: true })
        const endState = userReducer(initialState, refreshStart())
        expect(endState).toEqual(expectedState)
    })
    test('refresh error', () => {
        const initialState = mkUserState({
            userInfo: new UserInfo({
                userName: userNameTest,
                email: emailTest,
                namesPersonal: namesPersonalTest,
                idPersistent: 'idUserTest',
                permissionGroup: UserPermissionGroup.EDITOR
            })
        })
        const expectedState = mkUserState({})
        const endState = userReducer(initialState, refreshDenied())
        expect(endState).toEqual(expectedState)
    })
})
