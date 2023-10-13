import { ColumnType, newColumnDefinition } from '../../../column_menu/state'
import { Entity } from '../../../table/state'
import { Remote, useThunkReducer } from '../../../util/state'
import {
    GetMergeRequestConflictAction,
    ResolveConflictAction,
    StartMergeAction
} from '../async_actions'
import { useMergeRequestConflictResolutions } from '../hooks'
import { MergeRequestConflictResolutionState, TagInstance } from '../state'

jest.mock('../../../util/state', () => {
    const original = jest.requireActual('../../../util/state')
    return {
        ...original,
        useThunkReducer: jest.fn().mockImplementation()
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
    const entity = new Entity({
        displayTxt: 'test entity',
        idPersistent: 'id-entity-test',
        version: 92
    })
    const tagDefinitionOrigin = newColumnDefinition({
        namePath: ['tag definition origin test'],
        idPersistent: 'id-origin-test',
        columnType: ColumnType.String,
        curated: false,
        version: 3
    })
    const tagInstanceOrigin = new TagInstance({
        idPersistent: 'id-instance-origin-test',
        version: 12,
        value: 'test value origin'
    })
    const tagDefinitionDestination = newColumnDefinition({
        namePath: ['tag definition destination test'],
        idPersistent: 'id-destination-test',
        columnType: ColumnType.String,
        curated: false,
        version: 3
    })
    const tagInstanceDestination = new TagInstance({
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
