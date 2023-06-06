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
import { ColumnDefinition, ColumnSelectionEntry, ColumnType } from '../state'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function responseSequence(respones: [number, () => any][]) {
    const fetchMock = jest.spyOn(global, 'fetch')
    fetchMock.mockClear()
    for (const tpl of respones) {
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
                                type: typeRootTest
                            },
                            {
                                id_persistent: idPersistentRootTest1,
                                name: nameRootTest1,
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
        expect(dispatch.mock.calls.length).toBe(4)
        expect(dispatch.mock.calls[0][0]).toEqual(
            new LoadColumnHierarchyStartAction([])
        )
        expect(dispatch.mock.calls[1][0]).toEqual(
            new LoadColumnHierarchySuccessAction(
                [
                    new ColumnSelectionEntry({
                        columnDefinition: new ColumnDefinition({
                            namePath: [nameRootTest],
                            columnType: ColumnType.Inner,
                            idPersistent: idPersistentRootTest,
                            version: versionTest
                        }),
                        isExpanded: true
                    }),
                    new ColumnSelectionEntry({
                        columnDefinition: new ColumnDefinition({
                            namePath: [nameRootTest1],
                            columnType: ColumnType.Float,
                            idPersistent: idPersistentRootTest1,
                            version: versionTest
                        }),
                        isExpanded: false
                    })
                ],
                []
            )
        )
        expect(dispatch.mock.calls[2][0]).toEqual(
            new LoadColumnHierarchyStartAction([0])
        )
        expect(dispatch.mock.calls[3][0]).toEqual(
            new LoadColumnHierarchySuccessAction([], [0])
        )
    })

    const idPersistentChildTest = 'id_child_test'
    const nameChildTest = 'name child test'
    const typeChildTest = 'STRING'

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
                                version: versionTest,
                                type: typeRootTest
                            },
                            {
                                id_persistent: idPersistentRootTest1,
                                name: nameRootTest1,
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
            ]
        ])
        const action = new GetHierarchyAction({ expand: true })
        await action.run(dispatch)
        // expect(dispatch.mock.calls.length).toBe(4)
        expect(dispatch.mock.calls[0][0]).toEqual(
            new LoadColumnHierarchyStartAction([])
        )
        expect(dispatch.mock.calls[1][0]).toEqual(
            new LoadColumnHierarchySuccessAction(
                [
                    new ColumnSelectionEntry({
                        columnDefinition: new ColumnDefinition({
                            namePath: [nameRootTest],
                            columnType: ColumnType.Inner,
                            idPersistent: idPersistentRootTest,
                            version: versionTest
                        }),
                        isExpanded: true
                    }),
                    new ColumnSelectionEntry({
                        columnDefinition: new ColumnDefinition({
                            namePath: [nameRootTest1],
                            columnType: ColumnType.Float,
                            idPersistent: idPersistentRootTest1,
                            version: versionTest
                        }),
                        isExpanded: false
                    })
                ],
                []
            )
        )
        expect(dispatch.mock.calls[2][0]).toEqual(
            new LoadColumnHierarchyStartAction([0])
        )
        expect(dispatch.mock.calls[3][0]).toEqual(
            new LoadColumnHierarchySuccessAction(
                [
                    new ColumnSelectionEntry({
                        columnDefinition: new ColumnDefinition({
                            namePath: [nameRootTest, nameChildTest],
                            idPersistent: idPersistentChildTest,
                            idParentPersistent: idPersistentRootTest,
                            columnType: ColumnType.String,
                            version: versionTest
                        }),
                        isExpanded: false
                    })
                ],
                [0]
            )
        )
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
        expect(mockCallArg.msg).toEqual('Error from server')
        expect(mockCallArg.retryCallback).toBeDefined()
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
        expect(mockCallArg.msg).toEqual('Error from server')
        expect(mockCallArg.retryCallback).toBeUndefined()
    })
})
