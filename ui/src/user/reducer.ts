import { ErrorState } from '../util/error'
import {
    LoginErrorAction,
    LoginErrorClearAction,
    LoginStartAction,
    LoginSuccessAction,
    LogoutAction,
    RefreshDeniedAction,
    RefreshStartAction,
    RefreshSuccessAction,
    RegistrationErrorAction,
    RegistrationErrorClearAction,
    RegistrationStartAction,
    ToggleRegistrationAction,
    UserAction
} from './actions'
import { UserState } from './state'

export function userReducer(state: UserState, action: UserAction): UserState {
    if (action instanceof RefreshStartAction) {
        return new UserState({ ...state, isRefreshing: true })
    } else if (action instanceof RefreshDeniedAction) {
        return new UserState({})
    } else if (action instanceof RefreshSuccessAction) {
        return new UserState({ ...state, isRefreshing: false })
    } else if (action instanceof LoginStartAction) {
        return new UserState({
            userInfo: undefined,
            isLoggingIn: true
        })
    } else if (action instanceof LoginSuccessAction) {
        return new UserState({
            userInfo: action.userInfo
        })
    } else if (action instanceof LoginErrorAction) {
        return new UserState({
            loginErrorState: new ErrorState(action.msg)
        })
    } else if (action instanceof LoginErrorClearAction) {
        return new UserState({})
    } else if (action instanceof RegistrationStartAction) {
        return new UserState({
            isRegistering: true,
            showRegistration: state.showRegistration
        })
    } else if (action instanceof RegistrationErrorAction) {
        return new UserState({
            registrationErrorState: new ErrorState(action.msg),
            showRegistration: state.showRegistration
        })
    } else if (action instanceof RegistrationErrorClearAction) {
        return new UserState({ showRegistration: state.showRegistration })
    } else if (action instanceof LogoutAction) {
        return new UserState({})
    } else if (action instanceof ToggleRegistrationAction) {
        return new UserState({ showRegistration: !state.showRegistration })
    }
    return state
}
