vi.spyOn(global, 'fetch')
import { vi, Mock } from 'vitest'
import { UserPermissionGroup, newUserInfo } from '../../../user/state'
import {
    GetUserInfoListErrorAction,
    GetUserInfoListStartAction,
    GetUserInfoListSuccessAction,
    SetUserPermissionErrorAction,
    SetUserPermissionStartAction,
    SetUserPermissionSuccessAction
} from '../actions'
import { GetUserInfoListAction, SetUserPermissionAction } from '../async_actions'
import { addResponseSequence, expectFetchCallList } from '../../../util/tests/response'
import { client as cosmaeClient } from '../../../openapi/cosmae/client.gen'
import { config } from '../../../config'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function responseSequence(responses: [number, any][]) {
    addResponseSequence(fetch as Mock, responses)
}
const userNameTest = 'userTest'
const emailTest = 'me@test.url'
const namesPersonalTest = 'names personal test'
const idPersistentTest = 'id-user-test'
const permissionGroupTest = UserPermissionGroup.EDITOR
const userNameTest1 = 'userTest1'
const emailTest1 = 'me1@test.url'
const namesPersonalTest1 = 'names personal test1'
const idPersistentTest1 = 'id-user=test1'
const permissionGroupTest1 = UserPermissionGroup.CONTRIBUTOR
const userInfoTest = newUserInfo({
    username: userNameTest,
    email: emailTest,
    namesPersonal: namesPersonalTest,
    idPersistent: idPersistentTest,
    permissionGroup: permissionGroupTest
})
const userInfoTest1 = newUserInfo({
    username: userNameTest1,
    email: emailTest1,
    namesPersonal: namesPersonalTest1,
    idPersistent: idPersistentTest1,
    permissionGroup: permissionGroupTest1,
    isActive: false
})

const userInfoJsonTest = {
    username: userNameTest,
    email: emailTest,
    names_personal: namesPersonalTest,
    id_persistent: idPersistentTest,
    permission_group: 'EDITOR',
    id_column_persistent_list: [],
    is_active: true
}

const userInfoJsonTest1 = {
    username: userNameTest1,
    email: emailTest1,
    names_personal: namesPersonalTest1,
    id_persistent: idPersistentTest1,
    permission_group: 'CONTRIBUTOR',
    id_column_persistent_list: [],
    is_active: false
}

beforeAll(() => {
    cosmaeClient.setConfig({
        baseUrl: config.api_url,
        credentials: 'include',
        fetch
    })
})
beforeEach(() => {
    vi.clearAllMocks()
})
describe('get users', () => {
    test('success', async () => {
        responseSequence([
            [200, { user_list: [userInfoJsonTest], next_offset: 5 }],
            [200, { user_list: [userInfoJsonTest1], next_offset: 10 }],
            [200, { user_list: [], next_offset: -1 }]
        ])
        const dispatch = vi.fn()
        const reduxDispatch = vi.fn()
        await new GetUserInfoListAction().run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new GetUserInfoListStartAction()],
            [new GetUserInfoListSuccessAction([userInfoTest, userInfoTest1])]
        ])
        await expectFetchCallList((fetch as Mock).mock.calls, [
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
        const dispatch = vi.fn()
        const reduxDispatch = vi.fn()
        await new GetUserInfoListAction().run(dispatch, reduxDispatch)
        expect(dispatch.mock.calls).toEqual([
            [new GetUserInfoListStartAction()],
            [new GetUserInfoListErrorAction()]
        ])
    })
})
describe('set user permissions', () => {
    test('success permission group', async () => {
        responseSequence([[200, {}]])
        const dispatch = vi.fn()
        const reduxDispatch = vi.fn()
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
        await expectFetchCallList((fetch as Mock).mock.calls, [
            [
                `http://127.0.0.1:8000/cosmae/api/manage/user/id/${idPersistentTest}/permission_group`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    body: { permission_group: 'APPLICANT' }
                }
            ]
        ])
    })
    test('success active', async () => {
        responseSequence([[200, {}]])
        const dispatch = vi.fn()
        const reduxDispatch = vi.fn()
        await new SetUserPermissionAction(idPersistentTest, undefined, false).run(
            dispatch,
            reduxDispatch
        )
        expect(dispatch.mock.calls).toEqual([
            [new SetUserPermissionStartAction()],
            [new SetUserPermissionSuccessAction(idPersistentTest, undefined, false)]
        ])
        await expectFetchCallList((fetch as Mock).mock.calls, [
            [
                `http://127.0.0.1:8000/cosmae/api/manage/user/id/${idPersistentTest}/permission_group`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    body: { is_active: false }
                }
            ]
        ])
    })
    test('error', async () => {
        responseSequence([[400, { msg: 'error' }]])
        const dispatch = vi.fn()
        const reduxDispatch = vi.fn()
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
