import { describe, expect, test } from '@jest/globals'
import { TagDefinition, TagType, newTagDefinition } from '../../column_menu/state'
import {
    SetEntityLoadingAction,
    SetColumnLoadingAction,
    SetLoadDataErrorAction,
    SetEntitiesAction,
    AppendColumnAction,
    SubmitValuesStartAction,
    SubmitValuesEndAction,
    SubmitValuesErrorAction,
    EntityChangeOrCreateStartAction,
    EntityChangeOrCreateSuccessAction,
    EntityChangeOrCreateErrorAction
} from '../actions'
import {
    GetTableAsyncAction,
    GetColumnAsyncAction,
    parseValue,
    SubmitValuesAsyncAction,
    EntityChangeOrCreateAction
} from '../async_actions'
import { newErrorState } from '../../util/error/slice'
import { newEntity } from '../state'

jest.mock('uuid', () => {
    return {
        v4: () => 'id-error-test'
    }
})

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

const idPersistent0 = 'test-id-0'
const version0 = 0
const displayTxt0 = 'test display txt 0'
const displayTxt1 = 'test display txt 1'
const test_person_rsp_0 = {
    display_txt: displayTxt0,
    id_persistent: idPersistent0,
    version: version0,
    disabled: false
}
const test_person_rsp_1 = {
    display_txt: 'test display txt 1',
    id_persistent: 'test-id-1',
    version: 1,
    disabled: false
}

const entities_test = [
    newEntity({
        idPersistent: 'test-id-0',
        displayTxt: 'test display txt 0',
        version: 0,
        disabled: false
    }),
    newEntity({
        idPersistent: 'test-id-1',
        displayTxt: 'test display txt 1',
        version: 1,
        disabled: false
    })
]
const display_txt_column = {
    'test-id-0': [{ value: displayTxt0, idPersistent: 'test-id-0', version: 0 }],
    'test-id-1': [{ value: displayTxt1, idPersistent: 'test-id-1', version: 1 }]
}
const display_txt_column_as_normal_column = {
    'test-id-0': [{ value: displayTxt0, idPersistent: 'test-value-id-0', version: 12 }],
    'test-id-1': [{ value: displayTxt1, idPersistent: 'test-value-id-1', version: 1 }]
}

const displayTextTagDef: TagDefinition = {
    namePath: ['Display Text'],
    idPersistent: 'display_txt_id',
    columnType: TagType.String,
    curated: true,
    version: 0,
    hidden: false
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
            [new SetColumnLoadingAction(displayTextTagDef)],
            [new SetEntitiesAction(entities_test)],
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
            new SetColumnLoadingAction(displayTextTagDef)
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
            [new SetColumnLoadingAction(displayTextTagDef)],
            [
                new SetLoadDataErrorAction(
                    newErrorState(
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
            [new SetColumnLoadingAction(displayTextTagDef)],
            [new SetLoadDataErrorAction(newErrorState('test error'))]
        ])
    })
})
describe('get column async action', () => {
    const columnNameTest = 'column name test'
    const columnIdTest = 'column_id_test'
    const nameUserTest = 'user_test'
    const nameUserTest1 = 'user_test1'
    const columnDefTest = newTagDefinition({
        idPersistent: columnIdTest,
        namePath: [columnNameTest],
        version: 2,
        curated: false,
        columnType: TagType.String,
        owner: nameUserTest,
        hidden: false
    })
    const tagResponse = {
        id_entity_persistent: 'test-id-0',
        id_tag_definition_persistent: columnIdTest,
        value: displayTxt0,
        id_persistent: 'test-value-id-0',
        owner: nameUserTest,
        version: 12
    }
    const tagResponse1 = {
        id_entity_persistent: 'test-id-1',
        id_tag_definition_persistent: columnIdTest,
        value: displayTxt1,
        id_persistent: 'test-value-id-1',
        owner: nameUserTest1,
        version: 1
    }
    const tagDefTest: TagDefinition = {
        namePath: [columnNameTest],
        idPersistent: columnIdTest,
        idParentPersistent: undefined,
        columnType: TagType.String,
        curated: false,
        owner: nameUserTest,
        version: 2,
        hidden: false
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
            new SetColumnLoadingAction(tagDefTest)
        )
        expect(dispatch.mock.calls[1][0]).toEqual(
            new AppendColumnAction(columnIdTest, display_txt_column_as_normal_column)
        )
    })
    test('loads column with chunks', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tags: any[] = []
        for (let i = 0; i < 5000; ++i) {
            tags.push({
                ...tagResponse,
                id_entity_persistent: `id_${i}`,
                version: i * 2 + 2
            })
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
            new SetColumnLoadingAction(tagDefTest)
        )
        expect(dispatch.mock.calls[1][0]).toBeInstanceOf(AppendColumnAction)
        expect(Object.values(dispatch.mock.calls[1][0].columnData).length).toBe(5001)
        expect((fetch as jest.Mock).mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/tags/chunk',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_tag_definition_persistent: columnDefTest.idPersistent,
                        offset: 0,
                        limit: 5000
                    })
                }
            ],
            [
                'http://127.0.0.1:8000/cosmae/api/tags/chunk',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_tag_definition_persistent: columnDefTest.idPersistent,
                        offset: 10001,
                        limit: 5000
                    })
                }
            ]
        ])
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
            await new SubmitValuesAsyncAction(TagType.Float, [
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
            await new SubmitValuesAsyncAction(TagType.Float, [
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
                        newErrorState(
                            'The data you entered changed in the remote location. ' +
                                'The new values are updated in the table. Please review them.',
                            'id-error-test'
                        )
                    )
                ]
            ])
        })
        test('sets error', async () => {
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
            await new SubmitValuesAsyncAction(TagType.Float, [
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
        })
    })

    describe('parse Values', () => {
        test('parses valid float', () => {
            const parsedValue = parseValue(TagType.Float, '2.3')
            expect(parsedValue).toEqual(2.3)
        })
        test('NaN for invalid float', () => {
            const parsedValue = parseValue(TagType.Float, 'aa')
            expect(parsedValue).toBeNaN()
        })
        test('parses "True"', () => {
            const parsedValue = parseValue(TagType.Inner, 'True')
            expect(parsedValue).toBe(true)
        })
        test('parses "False"', () => {
            const parsedValue = parseValue(TagType.Inner, 'False')
            expect(parsedValue).toBe(false)
        })
        test('invalid boolean is false', () => {
            const parsedValue = parseValue(TagType.Inner, 'djdf')
            expect(parsedValue).toBe(false)
        })
        test('handles string', () => {
            const stringValue = 'test string'
            const parsedValue = parseValue(TagType.String, stringValue)
            expect(parsedValue).toEqual(stringValue)
        })
    })
})
describe('change or create entity', () => {
    test('success new entity', async () => {
        responseSequence([
            [
                200,
                () => {
                    return {
                        persons: [
                            {
                                id_persistent: idPersistent0,
                                display_txt: displayTxt0,
                                version: version0,
                                disabled: false
                            }
                        ]
                    }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new EntityChangeOrCreateAction({
            displayTxt: displayTxt0,
            disabled: false
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new EntityChangeOrCreateStartAction()],
            [
                new EntityChangeOrCreateSuccessAction(
                    newEntity({
                        idPersistent: idPersistent0,
                        displayTxt: displayTxt0,
                        version: version0,
                        disabled: false
                    })
                )
            ]
        ])
        expect((fetch as jest.Mock).mock.calls).toEqual([
            [
                'http://127.0.0.1:8000/cosmae/api/persons',
                {
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({ persons: [{ display_txt: displayTxt0 }] })
                }
            ]
        ])
    })
    test('error', async () => {
        responseSequence([
            [
                400,
                () => {
                    return { msg: 'error' }
                }
            ]
        ])
        const dispatch = jest.fn()
        await new EntityChangeOrCreateAction({
            displayTxt: displayTxt0,
            disabled: false
        }).run(dispatch)
        expect(dispatch.mock.calls).toEqual([
            [new EntityChangeOrCreateStartAction()],
            [new EntityChangeOrCreateErrorAction('error')]
        ])
    })
})
