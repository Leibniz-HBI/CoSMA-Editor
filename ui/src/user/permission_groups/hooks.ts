import { useAppDispatch } from '../../hooks'
import { useThunkReducer } from '../../util/state'
import { UserInfo, UserPermissionGroup } from '../state'
import { SelectUserInfoAction } from './actions'
import { GetUserInfoListAction, SetUserPermissionAction } from './async_actions'
import { permissionGroupReducer } from './reducer'
import { PermissionGroupState } from './state'

export function useUserPermissionGroup() {
    const reduxDispatch = useAppDispatch()
    const [state, dispatch] = useThunkReducer(
        permissionGroupReducer,
        new PermissionGroupState({}),
        reduxDispatch
    )
    return {
        userInfoList: state.userList,
        selectedUser: state.selectedUser,
        getUserInfoListCallback: () => {
            if (state.userList.isLoading) {
                return
            }
            dispatch(new GetUserInfoListAction())
        },
        setUserPermissionCallback: (
            idUserPersistent: string,
            permission: UserPermissionGroup
        ) => {
            if (state.selectedUser.isLoading) {
                return
            }
            dispatch(new SetUserPermissionAction(idUserPersistent, permission))
        },
        selectUserCallback: (userInfo: UserInfo) =>
            dispatch(new SelectUserInfoAction(userInfo))
    }
}
