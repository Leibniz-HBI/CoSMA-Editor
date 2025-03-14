import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { PublicUserInfo, UserInfo, UserState } from './state'
import { newRemote } from '../util/state'

const initialState: UserState = {
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
    }
})

export const userReducer = userSlice.reducer

export const {
    getUserInfoError,
    getUserInfoStart,
    getUserInfoSuccess,
    userSearchStart,
    userSearchSuccess,
    userSearchError,
    userSearchErrorClear,
    userSearchClear
} = userSlice.actions

export default userSlice.reducer
