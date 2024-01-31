import { TagType, newTagDefinition } from '../../../column_menu/state'
import { newEntity } from '../../../table/state'
import { Remote, useThunkReducer } from '../../../util/state'
import {
    GetMergeRequestConflictAction,
    ResolveConflictAction,
    StartMergeAction
} from '../async_actions'
import { useMergeRequestConflictResolutions } from '../hooks'
import { MergeRequestConflictResolutionState, newTagInstance } from '../state'

jest.mock('../../../util/state', () => {
    const original = jest.requireActual('../../../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn().mockImplementation()
    }
})
jest.mock('react-redux', () => {
    const mockDispatch = jest.fn()
    return {
        ...jest.requireActual('react-redux'),
        useDispatch: jest.fn().mockReturnValue(mockDispatch)
    }
})

test('get conflicts', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new MergeRequestConflictResolutionState(
            new Remote(undefined),
            new Remote(false)
        ),
        dispatch
    ])
    const { getMergeRequestConflictsCallback } = useMergeRequestConflictResolutions(
        'id-merge-request-test'
    )
    getMergeRequestConflictsCallback()
    expect(dispatch.mock.calls).toEqual([
        [new GetMergeRequestConflictAction('id-merge-request-test')]
    ])
})
test('get conflicts exits early', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new MergeRequestConflictResolutionState(
            new Remote(undefined, true),
            new Remote(false)
        ),
        dispatch
    ])
    const { getMergeRequestConflictsCallback } = useMergeRequestConflictResolutions(
        'id-merge-request-test'
    )
    getMergeRequestConflictsCallback()
    expect(dispatch.mock.calls).toEqual([])
})

test('resolve conflict callback', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new MergeRequestConflictResolutionState(
            new Remote(undefined, true),
            new Remote(false)
        ),
        dispatch
    ])
    const { resolveConflictCallback } = useMergeRequestConflictResolutions(
        'id-merge-request-test'
    )
    const entity = newEntity({
        displayTxt: 'test entity',
        idPersistent: 'id-entity-test',
        version: 92,
        disabled: false
    })
    const tagDefinitionOrigin = newTagDefinition({
        namePath: ['tag definition origin test'],
        idPersistent: 'id-origin-test',
        columnType: TagType.String,
        curated: false,
        version: 3,
        hidden: false
    })
    const tagInstanceOrigin = newTagInstance({
        idPersistent: 'id-instance-origin-test',
        version: 12,
        value: 'test value origin'
    })
    const tagDefinitionDestination = newTagDefinition({
        namePath: ['tag definition destination test'],
        idPersistent: 'id-destination-test',
        columnType: TagType.String,
        curated: false,
        version: 3,
        hidden: false
    })
    const tagInstanceDestination = newTagInstance({
        idPersistent: 'id-instance-destination-test',
        version: 12,
        value: 'test value destination'
    })
    resolveConflictCallback({
        entity,
        tagDefinitionOrigin,
        tagInstanceOrigin,
        tagDefinitionDestination,
        tagInstanceDestination,
        replace: true
    })
    expect(dispatch.mock.calls).toEqual([
        [
            new ResolveConflictAction({
                idMergeRequestPersistent: 'id-merge-request-test',
                entity,
                tagDefinitionOrigin,
                tagInstanceOrigin,
                tagDefinitionDestination,
                tagInstanceDestination,
                replace: true
            })
        ]
    ])
})
test('start merge callback', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new MergeRequestConflictResolutionState(
            new Remote(undefined, true),
            new Remote(false)
        ),
        dispatch
    ])
    const idMergeRequest = 'id-merge-request-test'
    const { startMergeCallback } = useMergeRequestConflictResolutions(idMergeRequest)
    startMergeCallback()
    expect(dispatch.mock.calls).toEqual([[new StartMergeAction(idMergeRequest)]])
})

test('start merge callback exits early', () => {
    const dispatch = jest.fn()
    ;(useThunkReducer as jest.Mock).mockReturnValue([
        new MergeRequestConflictResolutionState(
            new Remote(undefined, true),
            new Remote(false, true)
        ),
        dispatch
    ])
    const idMergeRequest = 'id-merge-request-test'
    const { startMergeCallback } = useMergeRequestConflictResolutions(idMergeRequest)
    startMergeCallback()
    expect(dispatch.mock.calls).toEqual([])
})
