import {
    loginError,
    loginStart,
    loginSuccess,
    logout,
    refreshDenied,
    refreshStart,
    registrationError,
    registrationStart,
    toggleRegistration,
    default as userReducer
} from '../slice'
import { UserPermissionGroup, newUserState, newUserInfo } from '../state'
import { newRemote } from '../../util/state'

describe('user reducer', () => {
    const userNameTest = 'userTest'
    const emailTest = 'me@test.url'
    const namesPersonalTest = 'names personal test'
    test('uses initial state', () => {
        expect(userReducer(undefined, { type: undefined })).toEqual({
            userInfo: undefined,
            isLoggingIn: false,
            isRefreshing: false,
            isRegistering: false,
            registrationErrorState: undefined,
            showRegistration: false,
            userSearchResults: newRemote([])
        })
    })
    test('successful login', () => {
        const initialState = newUserState({})
        const expectedState = newUserState({
            userInfo: newUserInfo({
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
                newUserInfo({
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
        const initialState = newUserState({ isLoggingIn: true })
        const expectedState = newUserState({})
        const endState = userReducer(initialState, loginError())
        expect(endState).toEqual(expectedState)
    })
    test('loginStart', () => {
        const initialState = newUserState({})
        const expectedState = newUserState({
            isLoggingIn: true
        })
        const endState = userReducer(initialState, loginStart())
        expect(endState).toEqual(expectedState)
    })
    test('switch to registration', () => {
        const initialState = newUserState({})
        const expectedState = newUserState({ showRegistration: true })
        const endState = userReducer(initialState, toggleRegistration())
        expect(endState).toEqual(expectedState)
    })
    test('switch  from registration', () => {
        const initialState = newUserState({ showRegistration: true })
        const expectedState = newUserState({})
        const endState = userReducer(initialState, toggleRegistration())
        expect(endState).toEqual(expectedState)
    })
    test('registrationError', () => {
        const initialState = newUserState({ isRegistering: true })
        const expectedState = newUserState({ isRegistering: false })
        const endState = userReducer(initialState, registrationError())
        expect(endState).toEqual(expectedState)
    })
    test('registrationStart', () => {
        const initialState = newUserState({})
        const expectedState = newUserState({
            isRegistering: true
        })
        const endState = userReducer(initialState, registrationStart())
        expect(endState).toEqual(expectedState)
    })
    test('logout', () => {
        const initialState = newUserState({
            userInfo: newUserInfo({
                userName: userNameTest,
                email: emailTest,
                namesPersonal: namesPersonalTest,
                idPersistent: 'idUserTest',
                permissionGroup: UserPermissionGroup.EDITOR
            })
        })
        const expectedState = newUserState({})
        const endState = userReducer(initialState, logout())
        expect(endState).toEqual(expectedState)
    })
    test('refresh start', () => {
        const initialState = newUserState({})
        const expectedState = newUserState({ isRefreshing: true })
        const endState = userReducer(initialState, refreshStart())
        expect(endState).toEqual(expectedState)
    })
    test('refresh error', () => {
        const initialState = newUserState({
            userInfo: newUserInfo({
                userName: userNameTest,
                email: emailTest,
                namesPersonal: namesPersonalTest,
                idPersistent: 'idUserTest',
                permissionGroup: UserPermissionGroup.EDITOR
            })
        })
        const expectedState = newUserState({})
        const endState = userReducer(initialState, refreshDenied())
        expect(endState).toEqual(expectedState)
    })
})
