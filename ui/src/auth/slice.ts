import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, AuthStep, EmailAllauth, newAuthState, UserAllAuth } from './state'
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
            state.emailVerified = newRemote(undefined)
            state.user.isLoading = false
        },
        getEmailAddressListEnd(state: AuthState) {
            state.emailAddressList.isLoading = false
        },
        getEmailAddressListStart(state: AuthState) {
            state.emailAddressList.isLoading = true
        },
        getEmailAddressListSuccess(
            state: AuthState,
            action: PayloadAction<EmailAllauth[]>
        ) {
            state.emailAddressList = newRemote(action.payload)
        },
        getTotpNotFound(state: AuthState, action: PayloadAction<string>) {
            state.totpUrl = newRemote(action.payload)
            const stepStackValue = state.stepStack.value
            stepStackValue[stepStackValue.length - 1] = AuthStep.Totp
            state.stepStack.isLoading = false
        },
        getTotpStart(state: AuthState) {
            state.stepStack.isLoading = true
            state.userAuth = undefined
        },
        getTotpSuccess(state: AuthState) {
            state.stepStack = newRemote([AuthStep.Totp])
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
        postEmailVerificationError(state: AuthState) {
            state.emailVerified=newRemote(false)
        },
        postEmailVerificationStart(state: AuthState) {
            state.emailVerified.isLoading = true
        },
        postEmailVerificationSuccess(state: AuthState) {
            state.emailVerified = newRemote(true)
        },
        postReauthenticateMfaStart(state: AuthState) {
            state.stepStack.isLoading = true
        },
        postReauthenticateMfaSuccess(
            state: AuthState,
            action: PayloadAction<UserAllAuth>
        ) {
            state.stepStack = newRemote([AuthStep.Authenticated])
            state.userAuth = action.payload
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
            state.totpUrl.isLoading = false
            state.userAuth = undefined
        },
        setReauthenticateMfa(state: AuthState) {
            state.stepStack = newRemote([AuthStep.ReauthenticationMfa])
            state.userAuth = undefined
        },
        setPartiallyAuthenticated(state: AuthState, action: PayloadAction<boolean>) {
            state.userAuth = undefined
            if (action.payload) {
                state.stepStack = newRemote([AuthStep.PartiallyAuthenticated])
            } else {
                state.stepStack = newRemote([AuthStep.Totp])
            }
        },
        setVerifyEmail(state: AuthState) {
            state.stepStack = newRemote([AuthStep.VerifyEmail])
        },
        registrationStart(state: AuthState) {
            state.registration.isLoading = true
        },
        registrationEnd(state: AuthState) {
            state.registration = newRemote(false)
        },
        resetEmailVerification(state: AuthState) {
            state.emailVerified = newRemote(undefined)
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
    getEmailAddressListEnd,
    getEmailAddressListStart,
    getEmailAddressListSuccess,
    getTotpNotFound,
    getTotpStart,
    getTotpSuccess,
    getSelfStart,
    getSelfSuccess,
    getSessionEnd,
    getSessionStart,
    loginPartial,
    loginStart,
    logoutStart,
    logoutSuccess,
    postEmailVerificationError,
    postEmailVerificationSuccess,
    postEmailVerificationStart,
    postReauthenticateMfaStart,
    postReauthenticateMfaSuccess,
    postReauthenticateStart,
    postReauthenticateSuccess,
    postTotpCodeEnd,
    postTotpCodeStart,
    postTotpCodeSuccess,
    registrationEnd,
    registrationStart,
    resetEmailVerification,
    setAuthUser,
    setReauthenticate,
    setReauthenticateMfa,
    setVerifyEmail,
    setPartiallyAuthenticated,
    removeUserTagDefinition,
    updateUserTagDefinition
} = authSlice.actions
