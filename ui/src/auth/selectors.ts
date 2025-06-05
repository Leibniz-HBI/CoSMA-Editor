import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

function selectAuthState(state: RootState) {
    return state.auth
}

export const selectAuthStepStack = createSelector(
    selectAuthState,
    (state) => state.stepStack
)

export const selectUserAuth = createSelector(selectAuthState, (state) => state.userAuth)

export const selectUserInfo = createSelector(selectAuthState, (state) => state.user)

export const selectPermissionGroup = createSelector(
    selectUserInfo,
    (userInfo) => userInfo.value?.permissionGroup
)

export const selectShowRegistration = createSelector(
    selectAuthState,
    (state) => state.registration
)

export const selectTotpUrl = createSelector(selectAuthState, (state) => state.totpUrl)

export const selectEmailVerification = createSelector(
    selectAuthState,
    (state) => state.emailVerified
)

export const selectPasswordChangeRequired = createSelector(
    selectAuthState,
    (state) => state.passwordChangeRequired
)
