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
            state.step.isLoading = false
        },
        getSelfEnd(state: AuthState) {
            state.user.isLoading = false
            state.step.value = AuthStep.LoggedOut
        },
        getSelfStart(state: AuthState) {
            state.user.isLoading = true
        },
        getSelfSuccess(state: AuthState, action: PayloadAction<UserInfo>) {
            state.user = newRemote(action.payload)
        },
        getSessionEnd(state: AuthState) {
            state.step = newRemote(AuthStep.LoggedOut)
        },
        getSessionStart(state: AuthState) {
            state.step = newRemote(AuthStep.Session, true)
        },
        loginStart(state: AuthState) {
            state.step = newRemote(AuthStep.Login, true)
        },
        setAuthUser(state: AuthState, action: PayloadAction<UserAllAuth | undefined>) {
            state.userAuth = action.payload
            state.step = newRemote(AuthStep.Authenticated)
        },
        registrationStart(state: AuthState) {
            state.showRegistration.isLoading = true
        },
        registrationEnd(state: AuthState) {
            state.showRegistration.isLoading = false
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
    getSelfEnd,
    getSelfStart,
    getSelfSuccess,
    getSessionEnd,
    getSessionStart,
    loginStart,
    registrationEnd,
    registrationStart,
    setAuthUser,
    toggleRegistration,
    removeUserTagDefinition,
    updateUserTagDefinition
} = authSlice.actions
