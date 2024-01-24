import { TagType, newTagDefinition } from '../../column_menu/state'
import { UserPermissionGroup } from '../../user/state'
import { RemoveSelectedColumnAction, TagChangeOwnershipShowAction } from '../actions'
import { mkColumnHeaderMenuEntries } from '../hooks'

const idTagDefinition = 'id-tag-test'
const tagDefinition = newTagDefinition({
    namePath: ['name', 'tag', 'test'],
    idPersistent: idTagDefinition,
    columnType: TagType.String,
    curated: false,
    hidden: false,
    version: 307
})

test('removeColumn callback dispatches correct actions when colum header selected.', () => {
    const dispatch = jest.fn()
    const reduxDispatch = jest.fn()
    const columnMenuEntries = mkColumnHeaderMenuEntries(
        UserPermissionGroup.CONTRIBUTOR,
        dispatch,
        reduxDispatch,
        tagDefinition
    )
    expect(columnMenuEntries.length).toEqual(2)
    const removeEntry = columnMenuEntries[0]
    expect(removeEntry.label).toEqual('Hide Column')
    expect(removeEntry.labelClassName).toEqual('danger text-danger')
    removeEntry.onClick()
    expect(dispatch.mock.calls).toEqual([[new RemoveSelectedColumnAction()]])
    const reduxCalls = reduxDispatch.mock.calls
    expect(reduxCalls.length).toEqual(1)
    const fetchMock = jest.fn()
    reduxCalls[0][0](undefined, undefined, fetchMock)
    expect(fetchMock.mock.calls).toEqual([
        [
            'http://127.0.0.1:8000/cosmae/api/user/tag_definitions/id-tag-test',
            { credentials: 'include', method: 'DELETE' }
        ]
    ])
})

test('change owner dispatches correct action', () => {
    const dispatch = jest.fn()
    const reduxDispatch = jest.fn()
    const columnMenuEntries = mkColumnHeaderMenuEntries(
        UserPermissionGroup.CONTRIBUTOR,
        dispatch,
        reduxDispatch,
        tagDefinition
    )
    expect(columnMenuEntries.length).toEqual(2)
    const changeOwnerEntry = columnMenuEntries[1]
    expect(changeOwnerEntry.label).toEqual('Change Owner')
    expect(changeOwnerEntry.labelClassName).toEqual('')
    changeOwnerEntry.onClick()
    expect(dispatch.mock.calls).toEqual([
        [new TagChangeOwnershipShowAction(tagDefinition)]
    ])
    const reduxCalls = reduxDispatch.mock.calls
    expect(reduxCalls.length).toEqual(0)
})
