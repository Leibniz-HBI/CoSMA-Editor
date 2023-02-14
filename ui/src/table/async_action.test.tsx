import { describe, expect, test } from '@jest/globals'
import { ColumnDefinition, ColumnType } from '../column_menu/state'
import {
    SetEntityLoadingAction,
    SetColumnLoadingAction,
    SetErrorAction,
    SetEntitiesAction,
    AppendColumnAction
} from './actions'
import { GetTableAsyncAction, GetColumnAsyncAction } from './async_actions'
import { ColumnState, TableState } from './state'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function responseSequence(respones: [number, () => any][]) {
    const fetchMock = jest.spyOn(global, 'fetch')
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

const test_person_rsp_0 = {
    names_family: 'test names family 0',
    names_personal: 'test names personal 0',
    display_txt: 'test display txt 0',
    id_persistent: 'test-id-0',
    version: 0
}
const test_person_rsp_1 = {
    names_family: 'test names family 1',
    names_personal: 'test names personal 1',
    display_txt: 'test display txt 1',
    id_persistent: 'test-id-1',
    version: 1
}

const entity_ids = ['test-id-0', 'test-id-1']
const displayTxt0 = 'test display txt 0'
const displayTxt1 = 'test display txt 1'
const display_txt_column = {
    'test-id-0': { values: [displayTxt0] },
    'test-id-1': { values: [displayTxt1] }
}

describe('get table async action', () => {
    test('early exit when already loading', async () => {
        const dispatch = jest.fn()
        await new GetTableAsyncAction('http://test').run(
            dispatch,
            new TableState({ isLoading: true })
        )
        expect(dispatch.mock.calls.length).toBe(0)
    })

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
        await new GetTableAsyncAction('http://test').run(dispatch, new TableState({}))
        expect(dispatch.mock.calls.length).toBe(4)
        expect(dispatch.mock.calls[0][0]).toEqual(new SetEntityLoadingAction())
        expect(dispatch.mock.calls[1][0]).toEqual(
            new SetColumnLoadingAction(
                'Display Text',
                'display_txt_id',
                ColumnType.String
            )
        )
        expect(dispatch.mock.calls[2][0]).toEqual(new SetEntitiesAction(entity_ids))
        expect(dispatch.mock.calls[3][0]).toEqual(
            new AppendColumnAction('display_txt_id', display_txt_column)
        )
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
        await new GetTableAsyncAction('http://test').run(dispatch, new TableState({}))
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
        await new GetTableAsyncAction('http://test').run(dispatch, new TableState({}))
        expect(dispatch.mock.calls.length).toBe(3)
        expect(dispatch.mock.calls[0][0]).toEqual(new SetEntityLoadingAction())
        expect(dispatch.mock.calls[1][0]).toEqual(
            new SetColumnLoadingAction(
                'Display Text',
                'display_txt_id',
                ColumnType.String
            )
        )
        expect(dispatch.mock.calls[2][0]).toEqual(
            new SetErrorAction('Could not load entities chunk 0. Reason: "test error"')
        )
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
        await new GetTableAsyncAction('http://test').run(dispatch, new TableState({}))
        expect(dispatch.mock.calls.length).toBe(3)
        expect(dispatch.mock.calls[0][0]).toEqual(new SetEntityLoadingAction())
        expect(dispatch.mock.calls[1][0]).toEqual(
            new SetColumnLoadingAction(
                'Display Text',
                'display_txt_id',
                ColumnType.String
            )
        )
        expect(dispatch.mock.calls[2][0]).toEqual(new SetErrorAction('test error'))
    })
})
describe('get column async action', () => {
    const columnNameTest = 'column name test'
    const columnIdTest = 'column_id_test'
    const columnNameTest1 = 'column name test 1'
    const columnIdTest1 = 'column_id_test_1'
    const columnDefTest = new ColumnDefinition({
        idPersistent: columnIdTest,
        namePath: [columnNameTest],
        version: 2,
        columnType: ColumnType.String
    })
    const tagResponse = {
        id_entity_persistent: 'test-id-0',
        id_tag_definition_persistent: columnIdTest,
        value: displayTxt0
    }
    const tagResponse1 = {
        id_entity_persistent: 'test-id-1',
        id_tag_definition_persistent: columnIdTest,
        value: displayTxt1
    }
    test('early exit when already loading', async () => {
        const dispatch = jest.fn()
        await new GetColumnAsyncAction('http://test', columnDefTest).run(
            dispatch,
            new TableState({
                columnIndices: new Map(Object.entries({ column_id_test: 1 })),
                columnStates: [
                    new ColumnState({
                        name: columnNameTest1,
                        idPersistent: columnIdTest1,
                        columnType: ColumnType.Float
                    }),
                    new ColumnState({
                        name: columnNameTest,
                        isLoading: true,
                        idPersistent: columnIdTest,
                        columnType: ColumnType.String
                    })
                ]
            })
        )
        expect(dispatch.mock.calls.length).toBe(0)
    })
    test('early exit when state is loading', async () => {
        const dispatch = jest.fn()
        await new GetColumnAsyncAction('http://test', columnDefTest).run(
            dispatch,
            new TableState({
                isLoading: true
            })
        )
        expect(dispatch.mock.calls.length).toBe(0)
    })

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
        await new GetColumnAsyncAction('http://test', columnDefTest).run(
            dispatch,
            new TableState({})
        )
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(
            new SetColumnLoadingAction(columnNameTest, columnIdTest, ColumnType.String)
        )
        expect(dispatch.mock.calls[1][0]).toEqual(
            new AppendColumnAction(columnIdTest, display_txt_column)
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
        await new GetColumnAsyncAction('http://test', columnDefTest).run(
            dispatch,
            new TableState({})
        )
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(
            new SetColumnLoadingAction(columnNameTest, columnIdTest, ColumnType.String)
        )
        expect(dispatch.mock.calls[1][0]).toBeInstanceOf(AppendColumnAction)
        expect(Object.values(dispatch.mock.calls[1][0].columnData).length).toBe(5001)
    })
})
