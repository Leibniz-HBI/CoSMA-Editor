import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, AuthStep, newAuthState, UserAllAuth } from './state'
import { newRemote } from '../util/state'
import { UserInfo } from '../user/state'
import { TagDefinition } from '../column_menu/state'

const authSlice = createSlice({
    name: 'auth',
    initialState: newAuthState({}),
    reducers: {
        authStepEnd(state: AuthState) {
            state.stepStack.isLoading = false
            state.totpUrl.isLoading = false
        },
        getTotpNotFound(state: AuthState, action: PayloadAction<string>) {
            state.totpUrl = newRemote(action.payload)
            const stepStackValue = state.stepStack.value
            stepStackValue[stepStackValue.length - 1] = AuthStep.Totp
            state.stepStack.isLoading = false
        },
        getTotpStart(state: AuthState) {
            state.stepStack.isLoading = true
        },
        getTotpSuccess(state: AuthState) {
            state.stepStack = newRemote([AuthStep.Totp])
        },
        getSelfEnd(state: AuthState) {
            state.user.isLoading = false
            state.stepStack.value = [AuthStep.LoggedOut]
        },
        getSelfStart(state: AuthState) {
            state.user.isLoading = true
        },
        getSelfSuccess(state: AuthState, action: PayloadAction<UserInfo>) {
            state.user = newRemote(action.payload)
        },
        getSessionEnd(state: AuthState) {
            state.stepStack = newRemote([AuthStep.LoggedOut])
        },
        getSessionStart(state: AuthState) {
            state.stepStack = newRemote([AuthStep.Session], true)
        },
        loginPartial(state: AuthState) {
            state.stepStack = newRemote([AuthStep.PartiallyAuthenticated])
        },
        loginStart(state: AuthState) {
            state.stepStack = newRemote([AuthStep.Login], true)
        },
        logoutStart(state: AuthState) {
            state.stepStack = newRemote([AuthStep.LoggedOut], true)
        },
        logoutSuccess(state: AuthState) {
            state.stepStack = newRemote([AuthStep.LoggedOut])
            state.userAuth = undefined
            state.user = newRemote(undefined)
        },
        postReauthenticateStart(state: AuthState) {
            state.stepStack.isLoading = true
        },
        postReauthenticateSuccess(state: AuthState) {
            state.stepStack.value.splice(-1, 1)
            state.stepStack.isLoading = false
        },
        postTotpCodeEnd(state: AuthState) {
            state.totpUrl.isLoading = false
            state.stepStack = newRemote([AuthStep.LoggedOut])
        },
        postTotpCodeStart(state: AuthState) {
            state.totpUrl.isLoading = true
        },
        postTotpCodeSuccess(state: AuthState) {
            state.totpUrl = newRemote(undefined)
            state.stepStack = newRemote([AuthStep.Authenticated])
        },
        setAuthUser(state: AuthState, action: PayloadAction<UserAllAuth | undefined>) {
            state.userAuth = action.payload
            state.stepStack = newRemote([AuthStep.Authenticated])
            state.totpUrl = newRemote(undefined)
        },
        setReauthenticate(state: AuthState) {
            state.stepStack.isLoading = false
            state.stepStack.value.push(AuthStep.Reauthentication)
            state.totpUrl.isLoading =false
        },
        setPartiallyAuthenticated(state: AuthState) {
            state.stepStack = newRemote([AuthStep.PartiallyAuthenticated])
        },
        registrationStart(state: AuthState) {
            state.showRegistration.isLoading = true
        },
        registrationEnd(state: AuthState) {
            state.showRegistration = newRemote(false)
        },
        toggleRegistration(state: AuthState, action: PayloadAction<boolean>) {
            state.showRegistration.value = action.payload
        },
        updateUserTagDefinition(
            state: AuthState,
            action: PayloadAction<TagDefinition>
        ) {
            if (state.user.value === undefined) {
                return
            }
            const idx = findUserColumnIndex(state, action.payload.idPersistent)
            if (idx >= 0) {
                state.user.value.columns[idx] = action.payload
            }
        },
        removeUserTagDefinition(state: AuthState, action: PayloadAction<string>) {
            const idx = findUserColumnIndex(state, action.payload)
            if (idx >= 0) {
                state.user.value?.columns.splice(idx, 1)
            }
        }
    }
})

export const authReducer = authSlice.reducer

function findUserColumnIndex(state: AuthState, idPersistent: string) {
    return (
        state.user.value?.columns.findIndex(
            (tagDefinition) => tagDefinition.idPersistent == idPersistent
        ) ?? -1
    )
}
export const {
    authStepEnd,
    getTotpNotFound,
    getTotpStart,
    getTotpSuccess,
    getSelfEnd,
    getSelfStart,
    getSelfSuccess,
    getSessionEnd,
    getSessionStart,
    loginPartial,
    loginStart,
    logoutStart,
    logoutSuccess,
    postReauthenticateStart,
    postReauthenticateSuccess,
    postTotpCodeEnd,
    postTotpCodeStart,
    postTotpCodeSuccess,
    registrationEnd,
    registrationStart,
    setAuthUser,
    setReauthenticate,
    setPartiallyAuthenticated,
    toggleRegistration,
    removeUserTagDefinition,
    updateUserTagDefinition
} = authSlice.actions
