import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { UserInfo, UserState } from './state'
import { ErrorState } from '../util/error/slice'

const initialState: UserState = {
    userInfo: undefined,
    showRegistration: false,
    isLoggingIn: false,
    isRegistering: false,
    isRefreshing: false,
    loginErrorState: undefined,
    registrationErrorState: undefined
}

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
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
        loginError: (state: UserState, action: PayloadAction<ErrorState>) => {
            state.isLoggingIn = false
            state.loginErrorState = action.payload
        },
        loginErrorClear: (state: UserState) => {
            state.loginErrorState = undefined
        },
        registrationStart: (state: UserState) => {
            state.isRegistering = true
        },
        registrationError: (state: UserState, action: PayloadAction<ErrorState>) => {
            state.isRegistering = false
            state.registrationErrorState = action.payload
        },
        registrationErrorClear: (state: UserState) => {
            state.registrationErrorState = undefined
        },
        toggleRegistration: (state: UserState) => {
            state.showRegistration = !state.showRegistration
        },
        logout: (state: UserState) => {
            state.userInfo = undefined
        }
    }
})

export const {
    loginStart,
    loginError,
    loginErrorClear,
    loginSuccess,
    refreshStart,
    refreshDenied,
    refreshSuccess,
    registrationStart,
    registrationError,
    registrationErrorClear,
    toggleRegistration,
    logout
} = userSlice.actions

export default userSlice.reducer
