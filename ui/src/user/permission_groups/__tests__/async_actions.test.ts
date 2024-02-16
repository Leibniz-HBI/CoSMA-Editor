import { UserPermissionGroup, newUserInfo } from '../../state'
import {
    GetUserInfoListErrorAction,
    GetUserInfoListStartAction,
    GetUserInfoListSuccessAction,
    SetUserPermissionErrorAction,
    SetUserPermissionStartAction,
    SetUserPermissionSuccessAction
} from '../actions'
import { GetUserInfoListAction, SetUserPermissionAction } from '../async_actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function responseSequence(responses: [number, any][]) {
    const fetchMock = jest.spyOn(global, 'fetch')
    for (const tpl of responses) {
        const [status_code, rsp] = tpl
        fetchMock.mockImplementationOnce(
            jest.fn(() =>
                Promise.resolve({
                    status: status_code,
                    json: () => Promise.resolve(rsp)
                })
            ) as jest.Mock
        )
    }
}
const userNameTest = 'userTest'
const emailTest = 'me@test.url'
const namesPersonalTest = 'names personal test'
const idPersistentTest = 'id-user=test'
const permissionGroupTest = UserPermissionGroup.EDITOR
const userNameTest1 = 'userTest1'
const emailTest1 = 'me1@test.url'
const namesPersonalTest1 = 'names personal test1'
const idPersistentTest1 = 'id-user=test1'
const permissionGroupTest1 = UserPermissionGroup.CONTRIBUTOR
const userInfoTest = newUserInfo({
    userName: userNameTest,
    email: emailTest,
    namesPersonal: namesPersonalTest,
    idPersistent: idPersistentTest,
    permissionGroup: permissionGroupTest
})
const userInfoTest1 = newUserInfo({
    userName: userNameTest1,
    email: emailTest1,
    namesPersonal: namesPersonalTest1,
    idPersistent: idPersistentTest1,
    permissionGroup: permissionGroupTest1
})

const userInfoJsonTest = {
    user_name: userNameTest,
    email: emailTest,
    names_personal: namesPersonalTest,
    id_persistent: idPersistentTest,
    permission_group: 'EDITOR',
    tag_definition_list: []
}

const userInfoJsonTest1 = {
    user_name: userNameTest1,
    email: emailTest1,
    names_personal: namesPersonalTest1,
    id_persistent: idPersistentTest1,
    permission_group: 'CONTRIBUTOR',
    tag_definition_list: []
}

describe('get users', () => {
    test('success', async () => {
        responseSequence([
            [200, { user_list: [userInfoJsonTest], next_offset: 5 }],
            [200, { user_list: [userInfoJsonTest1], next_offset: 10 }],
            [200, { user_list: [], next_offset: -1 }]
        ])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new GetUserInfoListAction().run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new GetUserInfoListStartAction()],
            [new GetUserInfoListSuccessAction([userInfoTest, userInfoTest1])]
        ])
        expect((fetch as jest.Mock).mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/user/chunks/0/5000',
                { credentials: 'include', method: 'GET' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/user/chunks/5/5000',
                { credentials: 'include', method: 'GET' }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/user/chunks/10/5000',
                { credentials: 'include', method: 'GET' }
            ]
        ])
    })
    test('error', async () => {
        responseSequence([
            [200, { user_list: [userInfoJsonTest], next_offset: 5 }],
            [400, { msg: 'error' }]
        ])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new GetUserInfoListAction().run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new GetUserInfoListStartAction()],
            [new GetUserInfoListErrorAction()]
        ])
    })
})
describe('set user permissions', () => {
    test('success', async () => {
        responseSequence([[200, {}]])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new SetUserPermissionAction(
            idPersistentTest,
            UserPermissionGroup.APPLICANT
        ).run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new SetUserPermissionStartAction()],
            [
                new SetUserPermissionSuccessAction(
                    idPersistentTest,
                    UserPermissionGroup.APPLICANT
                )
            ]
        ])
        expect((fetch as jest.Mock).mock.calls).toContainEqual([
            `http://127.0.0.1:8000/cosmae/api/user/${idPersistentTest}/permission_group`,
            {
                method: 'PUT',
                credentials: 'include',
                body: JSON.stringify({ permission_group: 'APPLICANT' })
            }
        ])
    })
    test('error', async () => {
        responseSequence([[400, { msg: 'error' }]])
        const dispatch = jest.fn()
        const reduxDispatch = jest.fn()
        await new SetUserPermissionAction(
            idPersistentTest,
            UserPermissionGroup.APPLICANT
        ).run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new SetUserPermissionStartAction()],
            [new SetUserPermissionErrorAction()]
        ])
    })
})
