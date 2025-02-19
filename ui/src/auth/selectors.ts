import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

function selectAuthState(state: RootState) {
    return state.auth
}

export const selectAuthStep = createSelector(selectAuthState, (state) => state.step)

export const selectUserAuth = createSelector(selectAuthState, (state) => state.userAuth)

export const selectUserInfo = createSelector(selectAuthState, (state) => state.user)

export const selectPermissionGroup = createSelector(
    selectUserInfo,
    (userInfo) => userInfo.value?.permissionGroup
)

export const selectShowRegistration = createSelector(
    selectAuthState,
    (state) => state.showRegistration
)

export const selectShowRegistrationValue = createSelector(
    selectShowRegistration,
    (state) => state.value
)
