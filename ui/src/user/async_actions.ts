import { Dispatch } from 'react'
import { AsyncAction } from '../util/async_action'
import {
    LoginErrorAction,
    LoginStartAction,
    LoginSuccessAction,
    RefreshDeniedAction,
    RefreshStartAction,
    RefreshSuccessAction,
    RegistrationErrorAction,
    RegistrationStartAction,
    UserAction
} from './actions'
import { PublicUserInfo, UserInfo, UserPermissionGroup } from './state'
import { exceptionMessage, unprocessableEntityMessage } from '../util/exception'
import { parseColumnDefinitionsFromApi } from '../column_menu/async_actions'
import { config } from '../config'

export class LoginAction extends AsyncAction<UserAction, void> {
    userName: string
    password: string

    constructor(userName: string, password: string) {
        super()
        this.userName = userName
        this.password = password
    }

    async run(dispatch: Dispatch<UserAction>) {
        dispatch(new LoginStartAction())
        try {
            const rsp = await fetch(config.api_path + '/user/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: this.userName, password: this.password })
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                const msg = json['msg']
                if (msg !== undefined) {
                    dispatch(new LoginErrorAction(json['msg']))
                } else {
                    dispatch(new LoginSuccessAction(parseUserInfoFromJson(json)))
                }
            } else {
                const json = await rsp.json()
                let msg = json['msg']
                if (msg === undefined) {
                    msg = 'Unknown error'
                }
                dispatch(new LoginErrorAction(msg))
            }
        } catch (e: unknown) {
            dispatch(new LoginErrorAction(exceptionMessage(e)))
        }
    }
}

export class RefreshAction extends AsyncAction<UserAction, UserInfo | undefined> {
    withDispatch: boolean

    constructor(withDispatch: boolean) {
        super()
        this.withDispatch = withDispatch
    }

    async run(dispatch: Dispatch<UserAction>): Promise<UserInfo | undefined> {
        if (this.withDispatch) {
            dispatch(new RefreshStartAction())
        }
        try {
            const rsp = await fetch(config.api_path + '/user/refresh', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                }
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                const userInfo = parseUserInfoFromJson(json)
                if (this.withDispatch) {
                    dispatch(new RefreshSuccessAction())
                }
                return userInfo
            } else {
                dispatch(new RefreshDeniedAction())
            }
        } catch (error: unknown) {
            dispatch(new RefreshDeniedAction())
        }
        return undefined
    }
}

export class RegistrationAction extends AsyncAction<UserAction, void> {
    userName: string
    namesPersonal: string
    namesFamily?: string
    email: string
    password: string

    constructor({
        userName,
        namesPersonal,
        namesFamily = undefined,
        email,
        password
    }: {
        userName: string
        namesPersonal: string
        namesFamily?: string
        email: string
        password: string
    }) {
        super()
        this.userName = userName
        this.namesPersonal = namesPersonal
        this.namesFamily = namesFamily
        this.email = email
        this.password = password
    }

    async run(dispatch: Dispatch<UserAction>) {
        dispatch(new RegistrationStartAction())
        try {
            const rsp = await fetch(config.api_path + '/user/register', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_name: this.userName,
                    email: this.email,
                    names_family: this.namesFamily == '' ? null : this.namesFamily,
                    names_personal: this.namesPersonal,
                    password: this.password
                })
            })
            if (rsp.status == 200) {
                const json = await rsp.json()
                dispatch(new LoginSuccessAction(parseUserInfoFromJson(json)))
            } else {
                if (rsp.status == 422) {
                    const json = await rsp.json()
                    const msg = unprocessableEntityMessage(json)
                    dispatch(new RegistrationErrorAction(msg))
                } else {
                    const json = await rsp.json()
                    let msg = json['msg']
                    if (msg === undefined) {
                        msg = 'Unknown error'
                    }
                    dispatch(new RegistrationErrorAction(msg))
                }
            }
        } catch (error: unknown) {
            dispatch(new RegistrationErrorAction(exceptionMessage(error)))
        }
    }
}
export class RemoteUserProfileColumnAppendAction extends AsyncAction<UserAction, void> {
    idTagPersistent: string

    constructor(idTagPersistent: string) {
        super()
        this.idTagPersistent = idTagPersistent
    }

    async run(_dispatch: Dispatch<UserAction>): Promise<void> {
        await fetch(
            config.api_path + `/user/tag_definitions/append/${this.idTagPersistent}`,
            { credentials: 'include', method: 'POST' }
        )
    }
}

export class RemoteUserProfileColumnDeleteAction extends AsyncAction<UserAction, void> {
    idTagPersistent: string

    constructor(idTagPersistent: string) {
        super()
        this.idTagPersistent = idTagPersistent
    }

    async run(_dispatch: Dispatch<UserAction>): Promise<void> {
        await fetch(config.api_path + `/user/tag_definitions/${this.idTagPersistent}`, {
            credentials: 'include',
            method: 'DELETE'
        })
    }
}

export class RemoteUserProfileChangeColumIndexAction extends AsyncAction<
    UserAction,
    void
> {
    idxStart: number
    idxEnd: number

    constructor(idxStart: number, idxEnd: number) {
        super()
        this.idxStart = idxStart
        this.idxEnd = idxEnd
    }
    async run(_dispatch: Dispatch<UserAction>): Promise<void> {
        await fetch(
            config.api_path +
                `/user/tag_definitions/swap/${this.idxStart}/${this.idxEnd}`,
            { credentials: 'include', method: 'POST' }
        )
    }
}

const permissionGroupApiMap: { [key: string]: UserPermissionGroup } = {
    APPLICANT: UserPermissionGroup.APPLICANT,
    READER: UserPermissionGroup.READER,
    CONTRIBUTOR: UserPermissionGroup.CONTRIBUTOR,
    EDITOR: UserPermissionGroup.EDITOR,
    COMMISSIONER: UserPermissionGroup.COMMISSIONER
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseUserInfoFromJson(json: any): UserInfo {
    return new UserInfo({
        userName: json['user_name'],
        idPersistent: json['id_persistent'],
        email: json['email'],
        namesPersonal: json['names_personal'],
        namesFamily: json['names_family'],
        columns:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (json['tag_definition_list'] as Array<any>).map((tagDefinitionApi) =>
                parseColumnDefinitionsFromApi(tagDefinitionApi, undefined)
            ),
        permissionGroup: permissionGroupApiMap[json['permission_group']]
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parsePublicUserInfoFromJson(userInfoJson: any) {
    const idPersistent = userInfoJson['id_persistent']
    const userName = userInfoJson['user_name']
    const permissionGroup = permissionGroupApiMap[userInfoJson['permission_group']]
    return new PublicUserInfo({ userName, idPersistent, permissionGroup })
}
