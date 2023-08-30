import { describe, expect, test } from '@jest/globals'
import { ColumnDefinition, ColumnType } from '../../column_menu/state'
import {
    SetEntityLoadingAction,
    SetColumnLoadingAction,
    SetLoadDataErrorAction,
    SetEntitiesAction,
    AppendColumnAction,
    SubmitValuesStartAction,
    SubmitValuesEndAction,
    SubmitValuesErrorAction
} from '../actions'
import {
    GetTableAsyncAction,
    GetColumnAsyncAction,
    parseValue,
    SubmitValuesAsyncAction
} from '../async_actions'
import { ErrorState } from '../../util/error/slice'

jest.mock('uuid', () => {
    return {
        v4: () => 'id-error-test'
    }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function responseSequence(responses: [number, () => any][]) {
    const fetchMock = jest.spyOn(global, 'fetch')
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

const test_person_rsp_0 = {
    display_txt: 'test display txt 0',
    id_persistent: 'test-id-0',
    version: 0
}
const test_person_rsp_1 = {
    display_txt: 'test display txt 1',
    id_persistent: 'test-id-1',
    version: 1
}

const entity_ids = ['test-id-0', 'test-id-1']
const displayTxt0 = 'test display txt 0'
const displayTxt1 = 'test display txt 1'
const display_txt_column = {
    'test-id-0': [{ value: displayTxt0, idPersistent: 'test-id-0', version: 0 }],
    'test-id-1': [{ value: displayTxt1, idPersistent: 'test-id-1', version: 1 }]
}
const display_txt_column_as_normal_column = {
    'test-id-0': [{ value: displayTxt0, idPersistent: 'test-value-id-0', version: 12 }],
    'test-id-1': [{ value: displayTxt1, idPersistent: 'test-value-id-1', version: 1 }]
}

describe('get table async action', () => {
    test('loads table with one chunk', async () => {
        responseSequence([
            [
                200,
                () => {
                    return {
                        persons: [test_person_rsp_0, test_person_rsp_1]
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new GetTableAsyncAction().run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new SetEntityLoadingAction()],
            [
                new SetColumnLoadingAction(
                    'Display Text',
                    'display_txt_id',
                    ColumnType.String
                )
            ],
            [new SetEntitiesAction(entity_ids)],
            [new AppendColumnAction('display_txt_id', display_txt_column)]
        ])
    })

    test('loads table with chunks', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const persons: any[][] = [[], [], []]
        for (let j = 0; j < 2; ++j) {
            for (let i = 0; i < 500; ++i) {
                persons[j].push({
                    id_persistent: 500 * j + i,
                    display_txt: 'display_text test'
                })
            }
        }
        persons[2].push({ id_persistent: 1001, display_txt: 'display text test' })
        responseSequence([
            [
                200,
                () => {
                    return { persons: persons[0] }
                }
            ],
            [
                200,
                () => {
                    return { persons: persons[1] }
                }
            ],
            [
                200,
                () => {
                    return { persons: persons[2] }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new GetTableAsyncAction().run(dispatch)
        expect(dispatch.mock.calls.length).toBe(4)
        expect(dispatch.mock.calls[0][0]).toEqual(new SetEntityLoadingAction())
        expect(dispatch.mock.calls[1][0]).toEqual(
            new SetColumnLoadingAction(
                'Display Text',
                'display_txt_id',
                ColumnType.String
            )
        )
        expect(dispatch.mock.calls[2][0].entities.length).toEqual(1001)
        expect(dispatch.mock.calls[3][0]).toBeInstanceOf(AppendColumnAction)
    })

    test('load chunk error code', async () => {
        responseSequence([
            [
                400,
                () => {
                    return {
                        msg: 'test error'
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new GetTableAsyncAction().run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new SetEntityLoadingAction()],
            [
                new SetColumnLoadingAction(
                    'Display Text',
                    'display_txt_id',
                    ColumnType.String
                )
            ],
            [
                new SetLoadDataErrorAction(
                    new ErrorState(
                        'Could not load entities chunk 0. Reason: "test error"'
                    )
                )
            ]
        ])
    })

    test('load chunk exception', async () => {
        responseSequence([
            [
                400,
                () => {
                    throw Error('test error')
                }
            ]
        ])
        const dispatch = jest.fn()
        await new GetTableAsyncAction().run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new SetEntityLoadingAction()],
            [
                new SetColumnLoadingAction(
                    'Display Text',
                    'display_txt_id',
                    ColumnType.String
                )
            ],
            [new SetLoadDataErrorAction(new ErrorState('test error'))]
        ])
    })
})
describe('get column async action', () => {
    const columnNameTest = 'column name test'
    const columnIdTest = 'column_id_test'
    const columnDefTest = new ColumnDefinition({
        idPersistent: columnIdTest,
        namePath: [columnNameTest],
        version: 2,
        columnType: ColumnType.String
    })
    const tagResponse = {
        id_entity_persistent: 'test-id-0',
        id_tag_definition_persistent: columnIdTest,
        value: displayTxt0,
        id_persistent: 'test-value-id-0',
        version: 12
    }
    const tagResponse1 = {
        id_entity_persistent: 'test-id-1',
        id_tag_definition_persistent: columnIdTest,
        value: displayTxt1,
        id_persistent: 'test-value-id-1',
        version: 1
    }

    test('loads column with one chunk', async () => {
        responseSequence([
            [
                200,
                () => {
                    return {
                        tag_instances: [tagResponse, tagResponse1]
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new GetColumnAsyncAction(columnDefTest).run(dispatch)
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(
            new SetColumnLoadingAction(columnNameTest, columnIdTest, ColumnType.String)
        )
        expect(dispatch.mock.calls[1][0]).toEqual(
            new AppendColumnAction(columnIdTest, display_txt_column_as_normal_column)
        )
    })
    test('loads column with chunks', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tags: any[] = []
        for (let i = 0; i < 5000; ++i) {
            tags.push({ ...tagResponse, id_entity_persistent: `id_${i}` })
        }
        responseSequence([
            [
                200,
                () => {
                    return { tag_instances: tags }
                }
            ],
            [
                200,
                () => {
                    return {
                        tag_instances: [tagResponse1]
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new GetColumnAsyncAction(columnDefTest).run(dispatch)
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(
            new SetColumnLoadingAction(columnNameTest, columnIdTest, ColumnType.String)
        )
        expect(dispatch.mock.calls[1][0]).toBeInstanceOf(AppendColumnAction)
        expect(Object.values(dispatch.mock.calls[1][0].columnData).length).toBe(5001)
    })

    describe('submit values', () => {
        const idValuePersistentTest = 'id-value-persistent'
        const valueTest = 2
        const versionTestBefore = 512
        const versionTestAfter = 513
        const idEntityTest = 'id-entity0'
        const idColumnDefTest = 'id-col-def0'
        test('changes state according to received values', async () => {
            responseSequence([
                [
                    200,
                    () => {
                        return {
                            tag_instances: [
                                {
                                    id_entity_persistent: idEntityTest,
                                    id_tag_definition_persistent: idColumnDefTest,
                                    id_persistent: idValuePersistentTest,
                                    value: valueTest,
                                    version: versionTestAfter
                                }
                            ]
                        }
                    }
                ]
            ])
            const dispatch = jest.fn()
            await new SubmitValuesAsyncAction(ColumnType.Float, [
                idEntityTest,
                idColumnDefTest,
                {
                    idPersistent: idValuePersistentTest,
                    version: versionTestBefore,
                    value: valueTest
                }
            ]).run(dispatch)
            expect(dispatch.mock.calls).toEqual([
                [new SubmitValuesStartAction()],
                [
                    new SubmitValuesEndAction([
                        [
                            idEntityTest,
                            idColumnDefTest,
                            {
                                version: versionTestAfter,
                                value: valueTest,
                                idPersistent: idValuePersistentTest
                            }
                        ]
                    ])
                ]
            ])
        })
        test('changes state on conflict', async () => {
            responseSequence([
                [
                    409,
                    () => {
                        return {
                            tag_instances: [
                                {
                                    id_entity_persistent: idEntityTest,
                                    id_tag_definition_persistent: idColumnDefTest,
                                    id_persistent: idValuePersistentTest,
                                    value: valueTest,
                                    version: versionTestAfter
                                }
                            ]
                        }
                    }
                ]
            ])
            const dispatch = jest.fn()
            await new SubmitValuesAsyncAction(ColumnType.Float, [
                idEntityTest,
                idColumnDefTest,
                {
                    idPersistent: idValuePersistentTest,
                    version: versionTestBefore,
                    value: valueTest
                }
            ]).run(dispatch)
            expect(dispatch.mock.calls).toEqual([
                [new SubmitValuesStartAction()],
                [
                    new SubmitValuesEndAction([
                        [
                            idEntityTest,
                            idColumnDefTest,
                            {
                                version: versionTestAfter,
                                value: valueTest,
                                idPersistent: idValuePersistentTest
                            }
                        ]
                    ])
                ],
                [
                    new SubmitValuesErrorAction(
                        new ErrorState(
                            'The data you entered changed in the remote location. ' +
                                'The new values are updated in the table. Please review them.',
                            undefined,
                            'id-error-test'
                        )
                    )
                ]
            ])
        })
        test('sets error with retry', async () => {
            responseSequence([
                [
                    500,
                    () => {
                        return {
                            msg: 'test error'
                        }
                    }
                ]
            ])
            const dispatch = jest.fn()
            await new SubmitValuesAsyncAction(ColumnType.Float, [
                idEntityTest,
                idColumnDefTest,
                {
                    idPersistent: idValuePersistentTest,
                    version: versionTestBefore,
                    value: valueTest
                }
            ]).run(dispatch)
            expect(dispatch.mock.calls.length).toEqual(2)
            expect(dispatch.mock.calls[0]).toEqual([new SubmitValuesStartAction()])
            const call2args = dispatch.mock.calls[1]
            expect(call2args.length).toEqual(1)
            expect(call2args[0]).toBeInstanceOf(SubmitValuesErrorAction)
            expect(call2args[0].error.msg).toEqual('test error')
            expect(call2args[0].error.retryCallback).toBeDefined()
        })
        test('sets error without retry', async () => {
            responseSequence([
                [
                    400,
                    () => {
                        return {
                            msg: 'test error'
                        }
                    }
                ]
            ])
            const dispatch = jest.fn()
            await new SubmitValuesAsyncAction(ColumnType.Float, [
                idEntityTest,
                idColumnDefTest,
                {
                    idPersistent: idValuePersistentTest,
                    version: versionTestBefore,
                    value: valueTest
                }
            ]).run(dispatch)
            expect(dispatch.mock.calls.length).toEqual(2)
            expect(dispatch.mock.calls[0]).toEqual([new SubmitValuesStartAction()])
            const call2args = dispatch.mock.calls[1]
            expect(call2args.length).toEqual(1)
            expect(call2args[0]).toBeInstanceOf(SubmitValuesErrorAction)
            expect(call2args[0].error.msg).toEqual('test error')
            expect(call2args[0].error.retryCallback).toBeUndefined()
        })
    })

    describe('parse Values', () => {
        test('parses valid float', () => {
            const parsedValue = parseValue(ColumnType.Float, '2.3')
            expect(parsedValue).toEqual(2.3)
        })
        test('NaN for invalid float', () => {
            const parsedValue = parseValue(ColumnType.Float, 'aa')
            expect(parsedValue).toBeNaN()
        })
        test('parses "True"', () => {
            const parsedValue = parseValue(ColumnType.Inner, 'True')
            expect(parsedValue).toBe(true)
        })
        test('parses "False"', () => {
            const parsedValue = parseValue(ColumnType.Inner, 'False')
            expect(parsedValue).toBe(false)
        })
        test('invalid boolean is false', () => {
            const parsedValue = parseValue(ColumnType.Inner, 'djdf')
            expect(parsedValue).toBe(false)
        })
        test('handles string', () => {
            const stringValue = 'test string'
            const parsedValue = parseValue(ColumnType.String, stringValue)
            expect(parsedValue).toEqual(stringValue)
        })
    })
})
