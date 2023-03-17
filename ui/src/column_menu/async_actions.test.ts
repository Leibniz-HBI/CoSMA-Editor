import { beforeEach, describe, expect, test } from '@jest/globals'
import {
    SetErrorAction,
    SetNavigationEntriesAction,
    StartLoadingAction
} from './actions'
import { GetHierarchyAction } from './async_actions'
import { ColumnDefinition, ColumnSelectionEntry, ColumnType } from './state'
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

const apiPathTest = 'http://test.org'
describe('column menu async actions', () => {
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
        const action = new GetHierarchyAction({ apiPath: apiPathTest })
        await action.run(dispatch)
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(new StartLoadingAction([]))
        const actionFromCall = dispatch.mock.calls[1][0]
        expect(actionFromCall).toBeInstanceOf(SetErrorAction)
        expect(actionFromCall.errorState.msg).toEqual(
            'Could not load column definitions. Reason: "loading Error"'
        )
    })
    test('handles fetch exception', async () => {
        const dispatch = jest.fn()
        jest.spyOn(global, 'fetch').mockImplementationOnce(() => {
            throw Error('fetch error')
        })
        const action = new GetHierarchyAction({ apiPath: apiPathTest })
        await action.run(dispatch)
        expect(dispatch.mock.calls.length).toBe(2)
        const actionFromCall = dispatch.mock.calls[1][0]
        expect(dispatch.mock.calls[0][0]).toEqual(new StartLoadingAction([]))
        expect(actionFromCall).toBeInstanceOf(SetErrorAction)
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
        const action = new GetHierarchyAction({ apiPath: apiPathTest })
        await action.run(dispatch)
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(new StartLoadingAction([]))
        expect(dispatch.mock.calls[1][0]).toEqual(
            new SetNavigationEntriesAction([], [])
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
        const action = new GetHierarchyAction({ apiPath: apiPathTest, expand: true })
        await action.run(dispatch)
        expect(dispatch.mock.calls.length).toBe(4)
        expect(dispatch.mock.calls[0][0]).toEqual(new StartLoadingAction([]))
        expect(dispatch.mock.calls[1][0]).toEqual(
            new SetNavigationEntriesAction(
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
        expect(dispatch.mock.calls[2][0]).toEqual(new StartLoadingAction([0]))
        expect(dispatch.mock.calls[3][0]).toEqual(
            new SetNavigationEntriesAction([], [0])
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
        const action = new GetHierarchyAction({ apiPath: apiPathTest, expand: true })
        await action.run(dispatch)
        // expect(dispatch.mock.calls.length).toBe(4)
        expect(dispatch.mock.calls[0][0]).toEqual(new StartLoadingAction([]))
        expect(dispatch.mock.calls[1][0]).toEqual(
            new SetNavigationEntriesAction(
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
        expect(dispatch.mock.calls[2][0]).toEqual(new StartLoadingAction([0]))
        expect(dispatch.mock.calls[3][0]).toEqual(
            new SetNavigationEntriesAction(
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
