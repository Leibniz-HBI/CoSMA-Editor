import { Dispatch } from 'react'
import { AsyncAction } from '../util/async_action'
import {
    LoginErrorAction,
    LoginStartAction,
    LoginSuccessAction,
    LogoutAction,
    RegistrationErrorAction,
    RegistrationStartAction,
    UserAction
} from './actions'
import { UserInfo } from './state'
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
                    dispatch(
                        new LoginSuccessAction(
                            new UserInfo({
                                userName: json['user_name'],
                                email: json['email'],
                                namesPersonal: json['names_personal'],
                                namesFamily: json['names_family'],
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                columns: (json['columns'] as Array<any>).map(
                                    (tagDefinitionApi) =>
                                        parseColumnDefinitionsFromApi(
                                            tagDefinitionApi,
                                            []
                                        )
                                )
                            })
                        )
                    )
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

export class RefreshAction extends AsyncAction<UserAction, void> {
    async run(dispatch: Dispatch<UserAction>) {
        dispatch(new LoginStartAction())
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
                dispatch(
                    new LoginSuccessAction(
                        new UserInfo({
                            userName: json['user_name'],
                            email: json['email'],
                            namesPersonal: json['names_personal'],
                            namesFamily: json['names_family'],
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            columns: (json['columns'] as Array<any>).map(
                                (tagDefinitionApi) =>
                                    parseColumnDefinitionsFromApi(tagDefinitionApi, [])
                            )
                        })
                    )
                )
            } else {
                dispatch(new LogoutAction())
            }
        } catch (error: unknown) {
            dispatch(new LogoutAction())
        }
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
                dispatch(
                    new LoginSuccessAction(
                        new UserInfo({
                            userName: json['user_name'],
                            email: json['email'],
                            namesPersonal: json['names_personal'],
                            namesFamily: json['names_family'],
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            columns: (json['columns'] as Array<any>).map(
                                (tagDefinitionApi) =>
                                    parseColumnDefinitionsFromApi(tagDefinitionApi, [])
                            )
                        })
                    )
                )
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
