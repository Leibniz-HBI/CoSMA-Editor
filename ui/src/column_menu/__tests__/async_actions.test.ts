import { beforeEach, describe, expect, test } from '@jest/globals'
import {
    LoadColumnHierarchyErrorAction,
    LoadColumnHierarchySuccessAction,
    LoadColumnHierarchyStartAction,
    SubmitColumnDefinitionErrorAction,
    SubmitColumnDefinitionStartAction,
    SubmitColumnDefinitionSuccessAction
} from '../actions'
import { GetHierarchyAction, SubmitColumnDefinitionAction } from '../async_actions'
import { ColumnSelectionEntry, ColumnType, newColumnDefinition } from '../state'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function responseSequence(responses: [number, () => any][]) {
    const fetchMock = jest.spyOn(global, 'fetch')
    fetchMock.mockClear()
    for (const tpl of responses) {
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

describe('getHierarchyAction', () => {
    beforeEach(() => {
        jest.restoreAllMocks()
        jest.clearAllMocks()
    })
    test('sets error state on initial loading', async () => {
        const dispatch = jest.fn()
        responseSequence([
            [
                400,
                () => {
                    return {
                        msg: 'loading Error'
                    }
                }
            ]
        ])
        const action = new GetHierarchyAction({})
        await action.run(dispatch)
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(
            new LoadColumnHierarchyStartAction([])
        )
        const actionFromCall = dispatch.mock.calls[1][0]
        expect(actionFromCall).toBeInstanceOf(LoadColumnHierarchyErrorAction)
        expect(actionFromCall.errorState.msg).toEqual(
            'Could not load column definitions. Reason: "loading Error"'
        )
    })
    test('handles fetch exception', async () => {
        const dispatch = jest.fn()
        jest.spyOn(global, 'fetch').mockImplementationOnce(() => {
            throw Error('fetch error')
        })
        const action = new GetHierarchyAction({})
        await action.run(dispatch)
        expect(dispatch.mock.calls.length).toBe(2)
        const actionFromCall = dispatch.mock.calls[1][0]
        expect(dispatch.mock.calls[0][0]).toEqual(
            new LoadColumnHierarchyStartAction([])
        )
        expect(actionFromCall).toBeInstanceOf(LoadColumnHierarchyErrorAction)
        expect(actionFromCall.errorState.msg).toEqual('fetch error')
    })
    test('handle empty response', async () => {
        const dispatch = jest.fn()
        responseSequence([
            [
                200,
                () => {
                    return {
                        tag_definitions: []
                    }
                }
            ]
        ])
        const action = new GetHierarchyAction({})
        await action.run(dispatch)
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(
            new LoadColumnHierarchyStartAction([])
        )
        expect(dispatch.mock.calls[1][0]).toEqual(
            new LoadColumnHierarchySuccessAction([], [])
        )
    })
    const idPersistentRootTest = 'tag_id_persistent_test'
    const idPersistentRootTest1 = 'tag_id_persistent_test1'
    const nameRootTest = 'name test'
    const nameRootTest1 = 'name test1'
    const versionTest = 0
    const typeRootTest = 'INNER'
    const typeRootTest1 = 'FLOAT'
    const curatedTest = true
    const curatedTest1 = false
    test('handle roots only', async () => {
        const dispatch = jest.fn()
        responseSequence([
            [
                200,
                () => {
                    return {
                        tag_definitions: [
                            {
                                id_persistent: idPersistentRootTest,
                                name: nameRootTest,
                                version: versionTest,
                                curated: curatedTest,
                                type: typeRootTest
                            },
                            {
                                id_persistent: idPersistentRootTest1,
                                name: nameRootTest1,
                                curated: curatedTest1,
                                version: versionTest,
                                type: typeRootTest1
                            }
                        ]
                    }
                }
            ],
            [
                200,
                () => {
                    return {
                        tag_definitions: []
                    }
                }
            ],
            [
                200,
                () => {
                    return {
                        tag_definitions: []
                    }
                }
            ]
        ])
        const action = new GetHierarchyAction({ expand: true })
        await action.run(dispatch)
        expect(dispatch.mock.calls.length).toBe(6)
        expect(dispatch.mock.calls).toEqual([
            [new LoadColumnHierarchyStartAction([])],
            [
                new LoadColumnHierarchySuccessAction(
                    [
                        new ColumnSelectionEntry({
                            columnDefinition: newColumnDefinition({
                                namePath: [nameRootTest],
                                columnType: ColumnType.Inner,
                                idPersistent: idPersistentRootTest,
                                curated: curatedTest,
                                version: versionTest
                            }),
                            isExpanded: true
                        }),
                        new ColumnSelectionEntry({
                            columnDefinition: newColumnDefinition({
                                namePath: [nameRootTest1],
                                columnType: ColumnType.Float,
                                idPersistent: idPersistentRootTest1,
                                curated: curatedTest1,
                                version: versionTest
                            }),
                            isExpanded: true
                        })
                    ],
                    []
                )
            ],
            [new LoadColumnHierarchyStartAction([0])],
            [new LoadColumnHierarchyStartAction([1])],
            [new LoadColumnHierarchySuccessAction([], [0])],
            [new LoadColumnHierarchySuccessAction([], [1])]
        ])
    })

    const idPersistentChildTest = 'id_child_test'
    const nameChildTest = 'name child test'
    const typeChildTest = 'STRING'
    const curatedChildTest = false

    test('handle child', async () => {
        const dispatch = jest.fn()
        responseSequence([
            [
                200,
                () => {
                    return {
                        tag_definitions: [
                            {
                                id_persistent: idPersistentRootTest,
                                name: nameRootTest,
                                curated: curatedTest,
                                version: versionTest,
                                type: typeRootTest
                            },
                            {
                                id_persistent: idPersistentRootTest1,
                                name: nameRootTest1,
                                curated: curatedTest1,
                                version: versionTest,
                                type: typeRootTest1
                            }
                        ]
                    }
                }
            ],
            [
                200,
                () => {
                    return {
                        tag_definitions: [
                            {
                                id_persistent: idPersistentChildTest,
                                id_parent_persistent: idPersistentRootTest,
                                name: nameChildTest,
                                type: typeChildTest,
                                curated: curatedChildTest,
                                version: versionTest
                            }
                        ]
                    }
                }
            ],
            [
                200,
                () => {
                    return {
                        tag_definitions: []
                    }
                }
            ],
            [
                200,
                () => {
                    return {
                        tag_definitions: []
                    }
                }
            ]
        ])
        const action = new GetHierarchyAction({ expand: true })
        await action.run(dispatch)
        // expect(dispatch.mock.calls.length).toBe(4)
        expect(dispatch.mock.calls).toEqual([
            [new LoadColumnHierarchyStartAction([])],
            [
                new LoadColumnHierarchySuccessAction(
                    [
                        new ColumnSelectionEntry({
                            columnDefinition: newColumnDefinition({
                                namePath: [nameRootTest],
                                columnType: ColumnType.Inner,
                                idPersistent: idPersistentRootTest,
                                curated: curatedTest,
                                version: versionTest
                            }),
                            isExpanded: true
                        }),
                        new ColumnSelectionEntry({
                            columnDefinition: newColumnDefinition({
                                namePath: [nameRootTest1],
                                columnType: ColumnType.Float,
                                idPersistent: idPersistentRootTest1,
                                curated: curatedTest1,
                                version: versionTest
                            }),
                            isExpanded: true
                        })
                    ],
                    []
                )
            ],
            [new LoadColumnHierarchyStartAction([0])],
            [new LoadColumnHierarchyStartAction([1])],
            [
                new LoadColumnHierarchySuccessAction(
                    [
                        new ColumnSelectionEntry({
                            columnDefinition: newColumnDefinition({
                                namePath: [nameRootTest, nameChildTest],
                                idPersistent: idPersistentChildTest,
                                idParentPersistent: idPersistentRootTest,
                                columnType: ColumnType.String,
                                curated: curatedChildTest,
                                version: versionTest
                            }),
                            isExpanded: false
                        })
                    ],
                    [0]
                )
            ],
            [new LoadColumnHierarchyStartAction([0, 0])],
            [new LoadColumnHierarchySuccessAction([], [1])],
            [new LoadColumnHierarchySuccessAction([], [0, 0])]
        ])
    })
})
describe('SubmitColumnDefinition', () => {
    beforeEach(() => {
        jest.restoreAllMocks()
        jest.clearAllMocks()
    })

    const idParentPersistentTest = 'id-parent-test'
    const nameTest = 'test column'
    test('submits definition', async () => {
        responseSequence([
            [
                200,
                () => {
                    return true
                }
            ]
        ])
        const dispatch = jest.fn()
        await new SubmitColumnDefinitionAction({
            columnTypeIdx: 2,
            idParentPersistent: idParentPersistentTest,
            name: nameTest
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new SubmitColumnDefinitionStartAction()],
            [new SubmitColumnDefinitionSuccessAction()]
        ])
        expect((fetch as jest.Mock).mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/tags/definitions',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        tag_definitions: [
                            {
                                name: nameTest,
                                id_parent_persistent: idParentPersistentTest,
                                type: 'INNER'
                            }
                        ]
                    })
                }
            ]
        ])
    })
    test('error with retry for server error', async () => {
        responseSequence([
            [
                500,
                () => {
                    return { msg: 'Error from server' }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new SubmitColumnDefinitionAction({
            columnTypeIdx: 2,
            idParentPersistent: idParentPersistentTest,
            name: nameTest
        }).run(dispatch)
        const mockCalls = dispatch.mock.calls
        expect(mockCalls.length).toEqual(2)
        expect(mockCalls[0]).toEqual([new SubmitColumnDefinitionStartAction()])
        expect(mockCalls[1].length).toEqual(1)
        const mockCallArg = mockCalls[1][0]
        expect(mockCallArg).toBeInstanceOf(SubmitColumnDefinitionErrorAction)
        expect(mockCallArg.error.msg).toEqual('Error from server')
        expect(mockCallArg.error.retryCallback).toBeDefined()
    })
    test('error without retry for bad request', async () => {
        responseSequence([
            [
                400,
                () => {
                    return { msg: 'Error from server' }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new SubmitColumnDefinitionAction({
            columnTypeIdx: 2,
            idParentPersistent: idParentPersistentTest,
            name: nameTest
        }).run(dispatch)
        const mockCalls = dispatch.mock.calls
        expect(mockCalls.length).toEqual(2)
        expect(mockCalls[0]).toEqual([new SubmitColumnDefinitionStartAction()])
        expect(mockCalls[1].length).toEqual(1)
        const mockCallArg = mockCalls[1][0]
        expect(mockCallArg).toBeInstanceOf(SubmitColumnDefinitionErrorAction)
        expect(mockCallArg.error.msg).toEqual('Error from server')
        expect(mockCallArg.error.retryCallback).toBeUndefined()
    })
})
