import { GridCellKind } from '@glideapps/glide-data-grid'
import { ColumnType, newColumnDefinition } from '../../../column_menu/state'
import { Remote, useThunkReducer } from '../../../util/state'
import { LoadContributionDetailsAsyncAction } from '../../details/async_action'
import {
    CompleteEntityAssignmentAction,
    GetContributionEntitiesAction,
    GetContributionEntityDuplicateCandidatesAction,
    GetContributionTagInstancesAsyncAction,
    PutDuplicateAction
} from '../async_actions'
import { mkCellContentCallback, useContributionEntities } from '../hooks'
import { ContributionEntityState, EntityWithDuplicates, ScoredEntity } from '../state'
import { AssignType } from '../../../table/draw'

jest.mock('../../../util/state', () => {
    return { ...jest.requireActual('../../../util/state'), useThunkReducer: jest.fn() }
})
const idContributionTest = 'id-contribution-test'
const entityTest = new EntityWithDuplicates({
    idPersistent: 'test-id-0',
    displayTxt: 'test display txt 0',
    version: 0,
    similarEntities: new Remote([])
})
const tagDefTest = newColumnDefinition({
    namePath: ['tag-def-test'],
    idPersistent: 'id-tag-def-test',
    columnType: ColumnType.String,
    curated: false,
    version: 0
})
describe('contribution entity hooks', () => {
    test('loads entities', async () => {
        const dispatch = jest.fn()
        dispatch.mockReturnValueOnce(Promise.resolve(null))
        dispatch.mockReturnValueOnce(Promise.resolve([entityTest]))
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({}),
            dispatch
        ])
        const { getEntityDuplicatesCallback } =
            useContributionEntities(idContributionTest)
        getEntityDuplicatesCallback()
        await new Promise((f) => setTimeout(f, 100))
        expect(dispatch.mock.calls).toEqual([
            [new LoadContributionDetailsAsyncAction(idContributionTest)],
            [new GetContributionEntitiesAction(idContributionTest)],
            [
                new GetContributionEntityDuplicateCandidatesAction({
                    idContributionPersistent: idContributionTest,
                    entityIdPersistentList: ['test-id-0']
                })
            ]
        ])
    })
    test('loads entities and tag instances', async () => {
        const dispatch = jest.fn()
        dispatch.mockReturnValueOnce(Promise.resolve(null))
        dispatch.mockReturnValueOnce(Promise.resolve([entityTest]))
        dispatch.mockReturnValueOnce(
            Promise.resolve(
                new Map([[entityTest.idPersistent, [entityTest.idPersistent]]])
            )
        )
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({ tagDefinitions: [tagDefTest] }),
            dispatch
        ])
        const { getEntityDuplicatesCallback } =
            useContributionEntities(idContributionTest)
        getEntityDuplicatesCallback()
        await new Promise((f) => setTimeout(f, 100))
        expect(dispatch.mock.calls).toEqual([
            [new LoadContributionDetailsAsyncAction(idContributionTest)],
            [new GetContributionEntitiesAction(idContributionTest)],
            [
                new GetContributionEntityDuplicateCandidatesAction({
                    idContributionPersistent: idContributionTest,
                    entityIdPersistentList: ['test-id-0']
                })
            ],
            [
                new GetContributionTagInstancesAsyncAction({
                    entitiesGroupMap: new Map([
                        [entityTest.idPersistent, [entityTest.idPersistent]]
                    ]),
                    tagDefinitionList: [tagDefTest],
                    idContributionPersistent: idContributionTest
                })
            ]
        ])
    })
    test('does not load entities when already loading', async () => {
        const dispatch = jest.fn()
        dispatch.mockReturnValueOnce(Promise.resolve(null))
        dispatch.mockReturnValueOnce(Promise.resolve([entityTest]))
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({ entities: new Remote([], true) }),
            dispatch
        ])
        const { getEntityDuplicatesCallback } =
            useContributionEntities(idContributionTest)
        getEntityDuplicatesCallback()
        await new Promise((f) => setTimeout(f, 100))
        expect(dispatch.mock.calls).toEqual([])
    })
    test('completes assignment', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({}),
            dispatch
        ])
        const { completeEntityAssignmentCallback } =
            useContributionEntities(idContributionTest)
        completeEntityAssignmentCallback()
        expect(dispatch.mock.calls).toEqual([
            [new CompleteEntityAssignmentAction(idContributionTest)]
        ])
    })
    test('does not redundantly complete assignment', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({
                completeEntityAssignment: new Remote(false, true)
            }),
            dispatch
        ])
        const { completeEntityAssignmentCallback } =
            useContributionEntities(idContributionTest)
        completeEntityAssignmentCallback()
        expect(dispatch.mock.calls).toEqual([])
    })
    test('put duplicate', () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({}),
            dispatch
        ])
        const { putDuplicateCallback } = useContributionEntities(idContributionTest)
        putDuplicateCallback('id-test-origin', 'id-test-destination')
        expect(dispatch.mock.calls).toEqual([
            [
                new PutDuplicateAction({
                    idContributionPersistent: idContributionTest,
                    idEntityOriginPersistent: 'id-test-origin',
                    idEntityDestinationPersistent: 'id-test-destination'
                })
            ]
        ])
    })
    test('add tag definitions', async () => {
        const dispatch = jest.fn()
        ;(useThunkReducer as jest.Mock).mockReturnValueOnce([
            new ContributionEntityState({
                entities: new Remote([
                    new EntityWithDuplicates({
                        idPersistent: 'id-entity-group',
                        displayTxt: 'entity group 0',
                        version: 1,
                        similarEntities: new Remote([
                            new ScoredEntity({
                                idPersistent: 'id-similar-test',
                                displayTxt: 'similar entity test 0',
                                version: 10,
                                similarity: 0.9
                            }),
                            new ScoredEntity({
                                idPersistent: 'id-similar-test-1',
                                displayTxt: 'similar entity test 1',
                                version: 11,
                                similarity: 0.8
                            })
                        ])
                    }),
                    new EntityWithDuplicates({
                        idPersistent: 'id-entity-group1',
                        displayTxt: 'entity group 1',
                        version: 2,
                        similarEntities: new Remote([
                            new ScoredEntity({
                                idPersistent: 'id-similar-test-2',
                                displayTxt: 'similar entity test 2',
                                version: 20,
                                similarity: 0.7
                            })
                        ])
                    })
                ])
            }),
            dispatch
        ])
        const { addTagDefinitionCallback } = useContributionEntities(idContributionTest)
        addTagDefinitionCallback(tagDefTest)
        expect(dispatch.mock.calls).toEqual([
            [
                new GetContributionTagInstancesAsyncAction({
                    entitiesGroupMap: new Map([
                        [
                            'id-entity-group',
                            ['id-entity-group', 'id-similar-test', 'id-similar-test-1']
                        ],
                        ['id-entity-group1', ['id-entity-group1', 'id-similar-test-2']]
                    ]),
                    tagDefinitionList: [tagDefTest],
                    idContributionPersistent: idContributionTest
                })
            ]
        ])
    })
})

describe('cell contents callback', () => {
    const entityTest = new EntityWithDuplicates({
        idPersistent: 'id-test',
        displayTxt: 'group entity test',
        version: 0,
        cellContents: [
            new Remote([
                { value: 'value group', idPersistent: 'id-instance-test', version: 0 }
            ])
        ],
        similarEntities: new Remote([
            new ScoredEntity({
                idPersistent: 'id-similar-test',
                displayTxt: 'similar entity test',
                version: 10,
                similarity: 0.9,
                cellContents: [
                    new Remote([
                        {
                            value: 'value similar',
                            idPersistent: 'id-instance-test',
                            version: 0
                        }
                    ])
                ]
            }),
            new ScoredEntity({
                idPersistent: 'id-similar-test-1',
                displayTxt: 'similar entity test 1',
                version: 11,
                similarity: 0.8,
                cellContents: [
                    new Remote([
                        {
                            value: 'value similar 1',
                            idPersistent: 'id-instance-test',
                            version: 0
                        }
                    ])
                ]
            })
        ])
    })
    const columnTypes = [
        {
            id: 'Assignment',
            title: 'Assignment',
            width: 200,
            columnType: ColumnType.Inner
        },
        {
            columnType: ColumnType.String,
            width: 200,
            id: 'display-text-test',
            title: 'display text'
        },
        {
            columnType: ColumnType.String,
            width: 200,
            id: 'similarity-test',
            title: 'Similarity'
        },
        {
            columnType: ColumnType.String,
            width: 200,
            id: 'column-test',
            title: 'column test'
        }
    ]
    test('handles original entity', () => {
        const cellCallback = mkCellContentCallback(entityTest, columnTypes)
        expect(cellCallback([0, 0])).toEqual({
            kind: 'custom' as GridCellKind,
            data: new AssignType(false, true)
        })
        expect(cellCallback([1, 0])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'group entity test',
            data: 'group entity test',
            contentAlign: 'left',
            themeOverride: { baseFontStyle: 'bold 13px' }
        })
        expect(cellCallback([2, 0])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: '',
            data: '',
            contentAlign: 'right',
            themeOverride: { baseFontStyle: 'bold 13px' }
        })
        expect(cellCallback([3, 0])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'value group',
            data: 'value group',
            contentAlign: 'right',
            themeOverride: { baseFontStyle: 'bold 13px' }
        })
    })
    test('handles similar entities', () => {
        const cellCallback = mkCellContentCallback(entityTest, columnTypes)
        expect(cellCallback([0, 1])).toEqual({
            kind: 'custom' as GridCellKind,
            data: new AssignType(true, false)
        })
        expect(cellCallback([1, 1])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'similar entity test',
            data: 'similar entity test',
            contentAlign: 'left',
            themeOverride: undefined
        })
        expect(cellCallback([2, 1])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: '90 %',
            data: '90 %',
            contentAlign: 'right',
            themeOverride: undefined
        })
        expect(cellCallback([3, 1])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'value similar',
            data: 'value similar',
            contentAlign: 'right',
            themeOverride: undefined
        })
        expect(cellCallback([0, 2])).toEqual({
            kind: 'custom' as GridCellKind,
            data: new AssignType(true, false)
        })
        expect(cellCallback([1, 2])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'similar entity test 1',
            data: 'similar entity test 1',
            contentAlign: 'left',
            themeOverride: undefined
        })
        expect(cellCallback([2, 2])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: '80 %',
            data: '80 %',
            contentAlign: 'right',
            themeOverride: undefined
        })
        expect(cellCallback([3, 2])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'value similar 1',
            data: 'value similar 1',
            contentAlign: 'right',
            themeOverride: undefined
        })
    })
})
