import { Remote } from '../../util/state'
import { UserInfo } from '../state'

export class PermissionGroupState {
    userList: Remote<UserInfo[]>
    userIndexMap: Map<string, number>
    selectedUser: Remote<UserInfo | undefined>

    constructor({
        userList = new Remote([]),
        userIndexMap,
        selectedUser = new Remote(undefined)
    }: {
        userList?: Remote<UserInfo[]>
        userIndexMap?: Map<string, number>
        selectedUser?: Remote<UserInfo | undefined>
    }) {
        this.selectedUser = selectedUser
        this.userList = userList
        if (userIndexMap === undefined || userIndexMap.size != userList.value.length) {
            this.userIndexMap = new Map(
                userList.value.map((userInfo, idx) => [userInfo.idPersistent, idx])
            )
        } else {
            this.userIndexMap = userIndexMap
        }
    }
}
