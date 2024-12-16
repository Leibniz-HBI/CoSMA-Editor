import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, AuthStep, newAuthState, SsoProvider, UserAllAuth } from './state'
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
        getConfigStart(state: AuthState) {
            state.step = newRemote(AuthStep.Config, true)
        },
        getConfigSuccess(state: AuthState, action: PayloadAction<SsoProvider[]>) {
            state.step.isLoading = false
            state.providers = action.payload
        },
        getSelfEnd(state: AuthState) {
            state.user.isLoading = false
        },
        getSelfStart(state: AuthState) {
            state.user.isLoading = true
        },
        getSelfSuccess(state: AuthState, action: PayloadAction<UserInfo>) {
            state.user = newRemote(action.payload)
        },
        getSessionStart(state: AuthState) {
            state.step = newRemote(AuthStep.Session, true)
        },
        redirectStart(state: AuthState) {
            state.step = newRemote(AuthStep.Redirect, true)
        },
        setAuthUser(state: AuthState, action: PayloadAction<UserAllAuth | undefined>) {
            state.userAuth = action.payload
            state.step = newRemote(AuthStep.Authenticated)
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
    getConfigStart,
    getConfigSuccess,
    getSelfEnd,
    getSelfStart,
    getSelfSuccess,
    getSessionStart,
    redirectStart,
    setAuthUser,
    removeUserTagDefinition,
    updateUserTagDefinition
} = authSlice.actions
