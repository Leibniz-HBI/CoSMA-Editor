import { Remote } from '../../../util/state'
import { UserInfo, UserPermissionGroup } from '../../state'
import {
    GetUserInfoListErrorAction,
    GetUserInfoListStartAction,
    GetUserInfoListSuccessAction,
    SelectUserInfoAction,
    SetUserPermissionClearErrorAction,
    SetUserPermissionErrorAction,
    SetUserPermissionStartAction,
    SetUserPermissionSuccessAction
} from '../actions'
import { permissionGroupReducer } from '../reducer'
import { PermissionGroupState } from '../state'

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
const userInfoTest = new UserInfo({
    userName: userNameTest,
    email: emailTest,
    namesPersonal: namesPersonalTest,
    idPersistent: idPersistentTest,
    permissionGroup: permissionGroupTest
})
const userInfoTest1 = new UserInfo({
    userName: userNameTest1,
    email: emailTest1,
    namesPersonal: namesPersonalTest1,
    idPersistent: idPersistentTest1,
    permissionGroup: permissionGroupTest1
})

describe('get users', () => {
    test('start', () => {
        const initialState = new PermissionGroupState({})
        const expectedState = new PermissionGroupState({
            userList: new Remote([], true),
            userIndexMap: new Map()
        })
        const endState = permissionGroupReducer(
            initialState,
            new GetUserInfoListStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const initialState = new PermissionGroupState({
            userList: new Remote([], true),
            userIndexMap: new Map()
        })
        const expectedState = new PermissionGroupState({
            userList: new Remote([userInfoTest, userInfoTest1], false)
        })
        const endState = permissionGroupReducer(
            initialState,
            new GetUserInfoListSuccessAction([userInfoTest, userInfoTest1])
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new PermissionGroupState({
            userList: new Remote([], true),
            userIndexMap: new Map()
        })
        const expectedState = new PermissionGroupState({
            userList: new Remote([], false, 'error')
        })
        const endState = permissionGroupReducer(
            initialState,
            new GetUserInfoListErrorAction('error')
        )
        expect(endState).toEqual(expectedState)
    })
})
describe('set permissions', () => {
    test('start', () => {
        const initialState = new PermissionGroupState({
            userList: new Remote([userInfoTest, userInfoTest1]),
            selectedUser: new Remote(userInfoTest1)
        })
        const expectedState = new PermissionGroupState({
            userList: new Remote([userInfoTest, userInfoTest1]),
            selectedUser: new Remote(userInfoTest1, true)
        })
        const endState = permissionGroupReducer(
            initialState,
            new SetUserPermissionStartAction()
        )
        expect(endState).toEqual(expectedState)
    })
    test('success', () => {
        const initialState = new PermissionGroupState({
            userList: new Remote([userInfoTest, userInfoTest1]),
            selectedUser: new Remote(userInfoTest1, true)
        })
        const changedUserInfo = new UserInfo({
            ...userInfoTest1,
            permissionGroup: UserPermissionGroup.APPLICANT
        })
        const expectedState = new PermissionGroupState({
            userList: new Remote([userInfoTest, changedUserInfo]),
            selectedUser: new Remote(changedUserInfo)
        })
        const endState = permissionGroupReducer(
            initialState,
            new SetUserPermissionSuccessAction(
                idPersistentTest1,
                UserPermissionGroup.APPLICANT
            )
        )
        expect(endState).toEqual(expectedState)
    })
    test('error', () => {
        const initialState = new PermissionGroupState({
            userList: new Remote([userInfoTest, userInfoTest1]),
            selectedUser: new Remote(userInfoTest1, true)
        })
        const expectedState = new PermissionGroupState({
            userList: new Remote([userInfoTest, userInfoTest1]),
            selectedUser: new Remote(userInfoTest1, false, 'error')
        })
        const endState = permissionGroupReducer(
            initialState,
            new SetUserPermissionErrorAction('error')
        )
        expect(endState).toEqual(expectedState)
    })
    test('clear error', () => {
        const initialState = new PermissionGroupState({
            userList: new Remote([userInfoTest, userInfoTest1]),
            selectedUser: new Remote(userInfoTest1, false, 'error')
        })
        const expectedState = new PermissionGroupState({
            userList: new Remote([userInfoTest, userInfoTest1]),
            selectedUser: new Remote(userInfoTest1)
        })
        const endState = permissionGroupReducer(
            initialState,
            new SetUserPermissionClearErrorAction()
        )
        expect(endState).toEqual(expectedState)
    })
})

test('select user', () => {
    const initialState = new PermissionGroupState({
        userList: new Remote([userInfoTest, userInfoTest1])
    })
    const expectedState = new PermissionGroupState({
        userList: new Remote([userInfoTest, userInfoTest1]),
        selectedUser: new Remote(userInfoTest1)
    })
    const endState = permissionGroupReducer(
        initialState,
        new SelectUserInfoAction(userInfoTest1)
    )
    expect(endState).toEqual(expectedState)
})
