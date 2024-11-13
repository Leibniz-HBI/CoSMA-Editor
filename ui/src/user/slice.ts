import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { PublicUserInfo, UserInfo, UserState } from './state'
import { newRemote } from '../util/state'
import { TagDefinition } from '../column_menu/state'

const initialState: UserState = {
    userInfo: undefined,
    showRegistration: false,
    isLoggingIn: false,
    isRegistering: false,
    isRefreshing: false,
    userInfoByIdPersistent: {},
    userSearchResults: newRemote([])
}

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        getUserInfoError(state: UserState, action: PayloadAction<string>) {
            state.userInfoByIdPersistent[action.payload].isLoading = false
        },
        getUserInfoStart(state: UserState, action: PayloadAction<string>) {
            state.userInfoByIdPersistent[action.payload] = newRemote(undefined, true)
        },
        getUserInfoSuccess(state: UserState, action: PayloadAction<PublicUserInfo>) {
            state.userInfoByIdPersistent[action.payload.idPersistent] = newRemote(
                action.payload
            )
        },
        refreshStart: (state: UserState) => {
            state.isRefreshing = true
        },
        refreshDenied: (state: UserState) => {
            state.userInfo = undefined
            state.isRefreshing = false
        },
        refreshSuccess: (state: UserState, action: PayloadAction<UserInfo>) => {
            state.isRefreshing = false
            state.userInfo = action.payload
        },
        loginStart: (state: UserState) => {
            state.userInfo = undefined
            state.isLoggingIn = true
        },
        loginSuccess: (state: UserState, action: PayloadAction<UserInfo>) => {
            state.userInfo = action.payload
            state.isLoggingIn = false
            state.isRegistering = false
        },
        loginError: (state: UserState) => {
            state.isLoggingIn = false
        },
        registrationStart: (state: UserState) => {
            state.isRegistering = true
        },
        registrationError: (state: UserState) => {
            state.isRegistering = false
        },
        registrationSuccess(stater: UserState) {
            stater.isRegistering = false
            stater.showRegistration = false
        },
        toggleRegistration: (state: UserState) => {
            state.showRegistration = !state.showRegistration
        },
        logout: (state: UserState) => {
            state.userInfo = undefined
        },
        userSearchStart(state: UserState) {
            state.userSearchResults = newRemote([], true)
        },
        userSearchSuccess(
            state: UserState,
            action: PayloadAction<(PublicUserInfo | UserInfo)[]>
        ) {
            state.userSearchResults = newRemote(action.payload)
        },
        userSearchError(state: UserState) {
            state.userSearchResults = newRemote([], false)
        },
        userSearchErrorClear(state: UserState) {
            state.userSearchResults.errorMsg = undefined
        },
        userSearchClear(state: UserState) {
            state.userSearchResults = newRemote([])
        },
        updateUserTagDefinition(
            state: UserState,
            action: PayloadAction<TagDefinition>
        ) {
            if (state.userInfo === undefined) {
                return
            }
            const idx = findUserColumnIndex(state, action.payload.idPersistent)
            if (idx >= 0) {
                state.userInfo.columns[idx] = action.payload
            }
        },
        removeUserTagDefinition(state: UserState, action: PayloadAction<string>) {
            const idx = findUserColumnIndex(state, action.payload)
            if (idx >= 0) {
                state.userInfo?.columns.splice(idx, 1)
            }
        }
    }
})

export const {
    getUserInfoError,
    getUserInfoStart,
    getUserInfoSuccess,
    loginStart,
    loginError,
    loginSuccess,
    refreshStart,
    refreshDenied,
    refreshSuccess,
    registrationStart,
    registrationSuccess,
    registrationError,
    toggleRegistration,
    logout,
    userSearchStart,
    userSearchSuccess,
    userSearchError,
    userSearchErrorClear,
    userSearchClear,
    updateUserTagDefinition,
    removeUserTagDefinition
} = userSlice.actions

export default userSlice.reducer
function findUserColumnIndex(state: UserState, idPersistent: string) {
    return (
        state.userInfo?.columns.findIndex(
            (tagDefinition) => tagDefinition.idPersistent == idPersistent
        ) ?? -1
    )
}
