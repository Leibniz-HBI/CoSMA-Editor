import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

export const selectUser = (state: RootState) => state.user

export const selectSearchResults = createSelector(
    selectUser,
    (userState) => userState.userSearchResults
)

const selectUserInfoByIdPersistentMap = createSelector(
    selectUser,
    (state) => state.userInfoByIdPersistent
)

export const makeSelectUserInfoByIdPersistent = () => {
    const selector = createSelector(
        [
            selectUserInfoByIdPersistentMap,
            (_state, idPersistent: string) => idPersistent
        ],
        (state, idPersistent) => state[idPersistent]
    )
    return selector
}

export const selectSshKeyList = createSelector(
    selectUser,
    (state) => state.sshKeyList
)
