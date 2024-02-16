import { Remote } from '../../util/state'
import { newUserInfo } from '../state'
import {
    GetUserInfoListErrorAction,
    GetUserInfoListStartAction,
    GetUserInfoListSuccessAction,
    SelectUserInfoAction,
    SetUserPermissionClearErrorAction,
    SetUserPermissionErrorAction,
    SetUserPermissionStartAction,
    SetUserPermissionSuccessAction,
    UserPermissionGroupAction
} from './actions'
import { PermissionGroupState } from './state'

export function permissionGroupReducer(
    state: PermissionGroupState,
    action: UserPermissionGroupAction
) {
    if (action instanceof SelectUserInfoAction) {
        return new PermissionGroupState({
            ...state,
            selectedUser: new Remote(action.userInfo)
        })
    }
    if (action instanceof SetUserPermissionStartAction) {
        return new PermissionGroupState({
            ...state,
            selectedUser: state.selectedUser.startLoading()
        })
    }
    if (action instanceof SetUserPermissionSuccessAction) {
        const idx = state.userIndexMap.get(action.idUserPersistent)
        let newUserList = state.userList
        if (idx !== undefined) {
            const user = state.userList.value[idx]
            if (user !== undefined && user.idPersistent == action.idUserPersistent) {
                newUserList = new Remote([
                    ...newUserList.value.slice(0, idx),
                    newUserInfo({ ...user, permissionGroup: action.permission }),
                    ...newUserList.value.slice(idx + 1)
                ])
            }
        }
        let newSelectedUser = state.selectedUser
        if (
            newSelectedUser.value !== undefined &&
            action.idUserPersistent == newSelectedUser.value?.idPersistent
        ) {
            newSelectedUser = new Remote(
                newUserInfo({
                    ...newSelectedUser.value,
                    permissionGroup: action.permission
                })
            )
        }
        return new PermissionGroupState({
            ...state,
            selectedUser: newSelectedUser,
            userList: newUserList
        })
    }
    if (action instanceof GetUserInfoListStartAction) {
        return new PermissionGroupState({
            ...state,
            userList: state.userList.startLoading()
        })
    }
    if (action instanceof GetUserInfoListSuccessAction) {
        return new PermissionGroupState({
            ...state,
            userList: state.userList.success(action.userInfoList)
        })
    }
    if (action instanceof GetUserInfoListErrorAction) {
        return new PermissionGroupState({
            ...state,
            userList: state.userList.withError(undefined)
        })
    }
    if (action instanceof SetUserPermissionErrorAction) {
        return new PermissionGroupState({
            ...state,
            selectedUser: state.selectedUser.withError(undefined)
        })
    }
    if (action instanceof SetUserPermissionClearErrorAction) {
        return new PermissionGroupState({
            ...state,
            selectedUser: state.selectedUser.withoutError()
        })
    }
    return state
}
