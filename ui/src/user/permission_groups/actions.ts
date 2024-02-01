import { UserInfo, UserPermissionGroup } from '../state'

export class GetUserInfoListStartAction {}

export class GetUserInfoListSuccessAction {
    userInfoList: UserInfo[]

    constructor(userInfoList: UserInfo[]) {
        this.userInfoList = userInfoList
    }
}

export class GetUserInfoListErrorAction {}

export class SelectUserInfoAction {
    userInfo: UserInfo
    constructor(userInfo: UserInfo) {
        this.userInfo = userInfo
    }
}

export class SetUserPermissionStartAction {}
export class SetUserPermissionSuccessAction {
    idUserPersistent: string
    permission: UserPermissionGroup

    constructor(idUserPersistent: string, permission: UserPermissionGroup) {
        this.idUserPersistent = idUserPersistent
        this.permission = permission
    }
}

export class SetUserPermissionErrorAction {}

export class SetUserPermissionClearErrorAction {}
export type UserPermissionGroupAction =
    | GetUserInfoListStartAction
    | GetUserInfoListSuccessAction
    | GetUserInfoListErrorAction
    | SelectUserInfoAction
    | SetUserPermissionStartAction
    | SetUserPermissionSuccessAction
    | SetUserPermissionErrorAction
    | SetUserPermissionClearErrorAction
