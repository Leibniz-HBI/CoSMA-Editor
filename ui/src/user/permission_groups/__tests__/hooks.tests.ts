import { Remote, useThunkReducer } from '../../../util/state'
import { UserInfo, UserPermissionGroup } from '../../state'
import { SelectUserInfoAction } from '../actions'
import { GetUserInfoListAction, SetUserPermissionAction } from '../async_actions'
import { useUserPermissionGroup } from '../hooks'
import { PermissionGroupState } from '../state'

jest.mock('../../../util/state', () => {
    const original = jest.requireActual('../../../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn()
    }
})
const userNameTest = 'userTest'
const emailTest = 'me@test.url'
const namesPersonalTest = 'names personal test'
const idPersistentTest = 'id-user=test'
const permissionGroupTest = UserPermissionGroup.EDITOR
const userInfoTest = new UserInfo({
    userName: userNameTest,
    email: emailTest,
    namesPersonal: namesPersonalTest,
    idPersistent: idPersistentTest,
    permissionGroup: permissionGroupTest
})
test('get user list callback', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new PermissionGroupState({}),
        dispatch
    ])
    const { getUserInfoListCallback } = useUserPermissionGroup()
    getUserInfoListCallback()
    expect(dispatch.mock.calls).toEqual([[new GetUserInfoListAction()]])
})
test('get user list callback exits early when already loading', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new PermissionGroupState({ userList: new Remote([], true) }),
        dispatch
    ])
    const { getUserInfoListCallback } = useUserPermissionGroup()
    getUserInfoListCallback()
    expect(dispatch.mock.calls).toEqual([])
})

test('set user permission callback', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new PermissionGroupState({}),
        dispatch
    ])
    const { setUserPermissionCallback } = useUserPermissionGroup()
    setUserPermissionCallback('id-user-test', UserPermissionGroup.CONTRIBUTOR)
    expect(dispatch.mock.calls).toEqual([
        [new SetUserPermissionAction('id-user-test', UserPermissionGroup.CONTRIBUTOR)]
    ])
})
test('set user permission callback exists early', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new PermissionGroupState({ selectedUser: new Remote(undefined, true) }),
        dispatch
    ])
    const { setUserPermissionCallback } = useUserPermissionGroup()
    setUserPermissionCallback('id-user-test', UserPermissionGroup.CONTRIBUTOR)
    expect(dispatch.mock.calls).toEqual([])
})
test('select user callback', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new PermissionGroupState({}),
        dispatch
    ])
    const { selectUserCallback } = useUserPermissionGroup()
    selectUserCallback(userInfoTest)
    expect(dispatch.mock.calls).toEqual([[new SelectUserInfoAction(userInfoTest)]])
})
