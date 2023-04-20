import {
    LoginErrorAction,
    LoginStartAction,
    LoginSuccessAction,
    LogoutAction,
    RefreshStartAction,
    RegistrationErrorAction,
    RegistrationStartAction
} from '../actions'
import { LoginAction, RefreshAction, RegistrationAction } from '../async_actions'
import { UserInfo } from '../state'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function responseSequence(respones: [number, () => any][]) {
    const fetchMock = jest.spyOn(global, 'fetch')
    for (const tpl of respones) {
        const [status_code, rsp] = tpl
        fetchMock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp())
                })
            ) as jest.Mock
        )
    }
}

const userNameTest = 'test_user'
const emailTest = 'me@test.url'
const passwordTest = 'password1234'
const namesPersonalTest = 'names personal test'
const namesFamilyTest = 'names family test'
const testError = 'test error message'

describe('login', () => {
    test('successful login', async () => {
        responseSequence([
            [
                200,
                () => {
                    return {
                        user_name: userNameTest,
                        names_personal: namesPersonalTest,
                        email: emailTest,
                        namesFamily: '',
                        columns: []
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new LoginAction(userNameTest, passwordTest).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoginStartAction()],
            [
                new LoginSuccessAction(
                    new UserInfo({
                        userName: userNameTest,
                        email: emailTest,
                        namesPersonal: namesPersonalTest
                    })
                )
            ]
        ])
    })
    test('unknown credentials', async () => {
        responseSequence([
            [
                200,
                () => {
                    return {
                        msg: testError
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new LoginAction(userNameTest, passwordTest).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoginStartAction()],
            [new LoginErrorAction(testError)]
        ])
    })
    test('error with msg', async () => {
        responseSequence([
            [
                400,
                () => {
                    return {
                        msg: testError
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new LoginAction(userNameTest, passwordTest).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoginStartAction()],
            [new LoginErrorAction(testError)]
        ])
    })
    test('error without msg', async () => {
        responseSequence([
            [
                400,
                () => {
                    return {}
                }
            ]
        ])
        const dispatch = jest.fn()
        await new LoginAction(userNameTest, passwordTest).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoginStartAction()],
            [new LoginErrorAction('Unknown error')]
        ])
    })
})

describe('refresh action', () => {
    test('successful refresh', async () => {
        responseSequence([
            [
                200,
                () => {
                    return {
                        user_name: userNameTest,
                        names_personal: namesPersonalTest,
                        email: emailTest,
                        namesFamily: '',
                        columns: []
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new RefreshAction().run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new RefreshStartAction()],
            [
                new LoginSuccessAction(
                    new UserInfo({
                        userName: userNameTest,
                        email: emailTest,
                        namesPersonal: namesPersonalTest
                    })
                )
            ]
        ])
    })
    test('logs out', async () => {
        responseSequence([
            [
                400,
                () => {
                    return {}
                }
            ]
        ])
        const dispatch = jest.fn()
        await new RefreshAction().run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoginStartAction()],
            [new LogoutAction()]
        ])
    })
    test('error without msg', async () => {
        responseSequence([
            [
                400,
                () => {
                    return {}
                }
            ]
        ])
        const dispatch = jest.fn()
        await new LoginAction(userNameTest, passwordTest).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new LoginStartAction()],
            [new LoginErrorAction('Unknown error')]
        ])
    })
})

describe('register action', () => {
    test('successfull registration', async () => {
        responseSequence([
            [
                200,
                () => {
                    return {
                        user_name: userNameTest,
                        names_personal: namesPersonalTest,
                        email: emailTest,
                        names_family: namesFamilyTest,
                        columns: []
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new RegistrationAction({
            userName: userNameTest,
            email: emailTest,
            namesPersonal: namesPersonalTest,
            namesFamily: namesFamilyTest,
            password: passwordTest
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new RegistrationStartAction()],
            [
                new LoginSuccessAction(
                    new UserInfo({
                        userName: userNameTest,
                        email: emailTest,
                        namesPersonal: namesPersonalTest,
                        namesFamily: namesFamilyTest
                    })
                )
            ]
        ])
    })
    test('registration info does not conform', async () => {
        responseSequence([
            [
                422,
                () => {
                    return {
                        detail: [{ loc: ['field'], msg: testError }]
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new RegistrationAction({
            userName: userNameTest,
            email: emailTest,
            namesPersonal: namesPersonalTest,
            namesFamily: namesFamilyTest,
            password: passwordTest
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new RegistrationStartAction()],
            [new RegistrationErrorAction('Error for field field: test error message.')]
        ])
    })
    test('error with msg', async () => {
        responseSequence([
            [
                400,
                () => {
                    return {
                        msg: testError
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new RegistrationAction({
            userName: userNameTest,
            email: emailTest,
            namesPersonal: namesPersonalTest,
            namesFamily: namesFamilyTest,
            password: passwordTest
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new RegistrationStartAction()],
            [new RegistrationErrorAction(testError)]
        ])
    })
    test('error without msg', async () => {
        responseSequence([
            [
                400,
                () => {
                    return {}
                }
            ]
        ])
        const dispatch = jest.fn()
        await new RegistrationAction({
            userName: userNameTest,
            email: emailTest,
            namesPersonal: namesPersonalTest,
            namesFamily: namesFamilyTest,
            password: passwordTest
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new RegistrationStartAction()],
            [new RegistrationErrorAction('Unknown error')]
        ])
    })
})
