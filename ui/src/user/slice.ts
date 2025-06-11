import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { newUserState, PublicUserInfo, SshKey, UserInfo, UserState } from './state'
import { newRemote } from '../util/state'

const initialState: UserState = newUserState({})

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
        deleteSshKeyEnd(state: UserState) {
            state.submitSshKey.isLoading = false
        },
        deleteSshKeyStart(state: UserState) {
            state.submitSshKey.isLoading = true
        },
        deleteSshKeySuccess(state: UserState, action: PayloadAction<string>) {
            state.sshKeyList.isLoading = false
            const idx = state.sshKeyList.value?.findIndex(
                (key) => key.idPersistent == action.payload
            )
            if (idx !== undefined) {
                state.sshKeyList.value?.splice(idx, 1)
            }
        },
        getSshKeyListEnd(state: UserState) {
            state.sshKeyList.isLoading = false
            state.sshKeyList.value = state.sshKeyList.value ?? []
        },
        getSshKeyListStart(state: UserState) {
            state.sshKeyList.isLoading = true
        },
        getSshKeyListSuccess(state: UserState, action: PayloadAction<SshKey[]>) {
            state.sshKeyList = newRemote(action.payload)
        },
        putSshKeyEnd(state: UserState) {
            state.submitSshKey = newRemote(false)
        },
        putSshKeyStart(state: UserState) {
            state.submitSshKey.isLoading = true
        },
        putSshKeySuccess(state: UserState, action: PayloadAction<SshKey>) {
            state.submitSshKey = newRemote(true)
            state.sshKeyList.value?.splice(0, 0, action.payload)
        },
        clearSshKeyList(state: UserState) {
            state.sshKeyList = newRemote(undefined)
        }
    }
})

export const userReducer = userSlice.reducer

export const {
    clearSshKeyList,
    deleteSshKeyEnd,
    deleteSshKeyStart,
    deleteSshKeySuccess,
    getUserInfoError,
    getUserInfoStart,
    getUserInfoSuccess,
    getSshKeyListEnd,
    getSshKeyListStart,
    getSshKeyListSuccess,
    putSshKeyEnd,
    putSshKeyStart,
    putSshKeySuccess,
    userSearchStart,
    userSearchSuccess,
    userSearchError,
    userSearchErrorClear,
    userSearchClear
} = userSlice.actions

export default userSlice.reducer
