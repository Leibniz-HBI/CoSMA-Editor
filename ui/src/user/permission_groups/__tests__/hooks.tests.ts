import { vi, Mock } from 'vitest'
import { Remote, useThunkReducer } from '../../../util/state'
import { UserPermissionGroup, newUserInfo } from '../../state'
import { SelectUserInfoAction } from '../actions'
import { GetUserInfoListAction, SetUserPermissionAction } from '../async_actions'
import { useUserPermissionGroup } from '../hooks'
import { PermissionGroupState } from '../state'

vi.mock('../../../util/state', async () => {
    const original = await vi.importActual('../../../util/state')
    return {
        ...original,
        useThunkReducer: vi.fn()
    }
})
vi.mock('react-redux', async () => {
    const mockDispatch = vi.fn()
    return {
        ...await vi.importActual('react-redux'),
        useDispatch: vi.fn().mockReturnValue(mockDispatch)
    }
})

const userNameTest = 'userTest'
const emailTest = 'me@test.url'
const namesPersonalTest = 'names personal test'
const idPersistentTest = 'id-user=test'
const permissionGroupTest = UserPermissionGroup.EDITOR
const userInfoTest = newUserInfo({
    username: userNameTest,
    email: emailTest,
    namesPersonal: namesPersonalTest,
    idPersistent: idPersistentTest,
    permissionGroup: permissionGroupTest
})
test('get user list callback', () => {
    const dispatch = vi.fn()
    ;(useThunkReducer as Mock).mockReturnValue([new PermissionGroupState({}), dispatch])
    const { getUserInfoListCallback } = useUserPermissionGroup()
    getUserInfoListCallback()
    expect(dispatch.mock.calls).toEqual([[new GetUserInfoListAction()]])
})
test('get user list callback exits early when already loading', () => {
    const dispatch = vi.fn()
    ;(useThunkReducer as Mock).mockReturnValue([
        new PermissionGroupState({ userList: new Remote([], true) }),
        dispatch
    ])
    const { getUserInfoListCallback } = useUserPermissionGroup()
    getUserInfoListCallback()
    expect(dispatch.mock.calls).toEqual([])
})

test('set user permission callback', () => {
    const dispatch = vi.fn()
    ;(useThunkReducer as Mock).mockReturnValue([new PermissionGroupState({}), dispatch])
    const { setUserPermissionCallback } = useUserPermissionGroup()
    setUserPermissionCallback('id-user-test', UserPermissionGroup.CONTRIBUTOR)
    expect(dispatch.mock.calls).toEqual([
        [new SetUserPermissionAction('id-user-test', UserPermissionGroup.CONTRIBUTOR)]
    ])
})
test('set user permission callback exists early', () => {
    const dispatch = vi.fn()
    ;(useThunkReducer as Mock).mockReturnValue([
        new PermissionGroupState({ selectedUser: new Remote(undefined, true) }),
        dispatch
    ])
    const { setUserPermissionCallback } = useUserPermissionGroup()
    setUserPermissionCallback('id-user-test', UserPermissionGroup.CONTRIBUTOR)
    expect(dispatch.mock.calls).toEqual([])
})
test('select user callback', () => {
    const dispatch = vi.fn()
    ;(useThunkReducer as Mock).mockReturnValue([new PermissionGroupState({}), dispatch])
    const { selectUserCallback } = useUserPermissionGroup()
    selectUserCallback(userInfoTest)
    expect(dispatch.mock.calls).toEqual([[new SelectUserInfoAction(userInfoTest)]])
})
