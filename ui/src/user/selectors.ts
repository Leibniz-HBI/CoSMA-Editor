import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

export const selectUser = (state: RootState) => state.user

export const selectIsLoggedIn = createSelector(
    selectUser,
    (userState) => userState.userInfo === undefined || userState.userInfo === null
)

export const selectIsActive = createSelector(
    selectUser,
    (userState) => userState.isRegistering || userState.isLoggingIn
)

export const selectUserInfo = createSelector(
    selectUser,
    (userState) => userState.userInfo
)

export const selectPermissionGroup = createSelector(
    selectUserInfo,
    (userInfo) => userInfo?.permissionGroup
)

export const selectSearchResults = createSelector(
    selectUser,
    (userState) => userState.userSearchResults
)
