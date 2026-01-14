import { Dispatch } from 'react'
import { AsyncAction } from '../../util/async_action'
import {
    GetUserInfoListErrorAction,
    GetUserInfoListStartAction,
    GetUserInfoListSuccessAction,
    SetUserPermissionErrorAction,
    SetUserPermissionStartAction,
    SetUserPermissionSuccessAction,
    UserPermissionGroupAction
} from './actions'
import { exceptionMessage } from '../../util/exception'
import { parseUserInfoFromJson } from '../thunks'
import { UserInfo, UserPermissionGroup } from '../state'
import { AppDispatch } from '../../store'
import { addError } from '../../util/notification/slice'
import {
    cosmaeUserApiGetUserChunk,
    cosmaeUserApiPutUserPermissionGroup
} from '../../openapi/cosmae'

export class GetUserInfoListAction extends AsyncAction<
    UserPermissionGroupAction,
    void
> {
    async run(
        dispatch: Dispatch<UserPermissionGroupAction>,
        reduxDispatch: AppDispatch
    ) {
        dispatch(new GetUserInfoListStartAction())
        try {
            let userInfoList: UserInfo[] = []
            const count = 5000
            for (let offset = 0; ; ) {
                const rsp = await cosmaeUserApiGetUserChunk({ path: { offset, count } })
                if (rsp.error) {
                    dispatch(new GetUserInfoListErrorAction())
                    reduxDispatch(addError(rsp.error.msg))
                    return
                }
                userInfoList = [
                    ...userInfoList,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...rsp.data.user_list.map((userInfoJson: any) =>
                        parseUserInfoFromJson(userInfoJson)
                    )
                ]
                offset = rsp.data.next_offset
                if (offset <= 0) {
                    dispatch(new GetUserInfoListSuccessAction(userInfoList))
                    return
                }
            }
        } catch (e: unknown) {
            dispatch(new GetUserInfoListErrorAction())
            reduxDispatch(addError(exceptionMessage(e)))
        }
    }
}

export class SetUserPermissionAction extends AsyncAction<
    UserPermissionGroupAction,
    void
> {
    idUserPersistent: string
    permission: UserPermissionGroup

    constructor(idUserPersistent: string, permission: UserPermissionGroup) {
        super()
        this.idUserPersistent = idUserPersistent
        this.permission = permission
    }
    async run(
        dispatch: Dispatch<UserPermissionGroupAction>,
        reduxDispatch: AppDispatch
    ) {
        dispatch(new SetUserPermissionStartAction())
        try {
            const rsp = await cosmaeUserApiPutUserPermissionGroup({
                path: { id_user_persistent: this.idUserPersistent },
                body: { permission_group: this.permission.toString().toUpperCase() }
            })
            if (rsp.data) {
                dispatch(
                    new SetUserPermissionSuccessAction(
                        this.idUserPersistent,
                        this.permission
                    )
                )
            } else {
                dispatch(new SetUserPermissionErrorAction())
                reduxDispatch(addError(rsp.error.msg))
            }
        } catch (e: unknown) {
            dispatch(new SetUserPermissionErrorAction())
            reduxDispatch(addError(exceptionMessage(e)))
        }
    }
}
