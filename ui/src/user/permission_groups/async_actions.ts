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
import { config } from '../../config'
import { parseUserInfoFromJson } from '../thunks'
import { UserInfo, UserPermissionGroup } from '../state'
import { AppDispatch } from '../../store'
import { addError } from '../../util/notification/slice'

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
                const rsp = await fetch(
                    config.api_path + '/user/chunks/' + (offset + '/' + count),
                    {
                        method: 'GET',
                        credentials: 'include'
                    }
                )
                const json = await rsp.json()
                if (rsp.status != 200) {
                    dispatch(new GetUserInfoListErrorAction())
                    reduxDispatch(addError(json['msg']))
                    return
                }
                userInfoList = [
                    ...userInfoList,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...json['user_list'].map((userInfoJson: any) =>
                        parseUserInfoFromJson(userInfoJson)
                    )
                ]
                offset = json['next_offset']
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
            const rsp = await fetch(
                config.api_path + `/user/${this.idUserPersistent}/permission_group`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    body: JSON.stringify({
                        permission_group: this.permission.toString().toUpperCase()
                    })
                }
            )
            if (rsp.status == 200) {
                dispatch(
                    new SetUserPermissionSuccessAction(
                        this.idUserPersistent,
                        this.permission
                    )
                )
            } else {
                const json = await rsp.json()
                dispatch(new SetUserPermissionErrorAction())
                reduxDispatch(addError(json['msg']))
            }
        } catch (e: unknown) {
            dispatch(new SetUserPermissionErrorAction())
            reduxDispatch(addError(exceptionMessage(e)))
        }
    }
}
