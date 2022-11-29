import { describe, expect, test } from '@jest/globals';
import { SetLoadingAction, SetErrorAction, SetTableAction } from './actions';
import { GetTableAsyncAction } from "./async_actions"
import { TableState } from './state';


function responseSequence(respones: ([number, () => any])[]) {
    const fetchMock = jest.spyOn(global, "fetch")
    for (let tpl of respones) {
        const [status_code, rsp] = tpl
        fetchMock.mockImplementationOnce(jest.fn(() =>
            Promise.resolve({
                status: status_code,
                json: () => Promise.resolve(rsp()),
            })
        ) as jest.Mock)

    }

}

const test_person_rsp_0 = {
    'names_family': 'test names family 0',
    'names_personal': 'test names personal 0',
    'display_txt': 'test display txt 0',
    'id_persistent': 'test-id-0',
    'version': 0
}
const test_person_rsp_1 = {
    'names_family': 'test names family 1',
    'names_personal': 'test names personal 1',
    'display_txt': 'test display txt 1',
    'id_persistent': 'test-id-1',
    'version': 1
}


describe('get table async action', () => {
    test("early exit when already loadint", async () => {
        const dispatch = jest.fn()
        await new GetTableAsyncAction('http://test').run(
            dispatch,
            new TableState({ columns: [], isLoading: true }))
        expect(dispatch.mock.calls.length).toBe(0)
    })
    test("loads table with one chunk", async () => {
        responseSequence([
            [200, () => { return { 'count': 2 } }],
            [200, () => {
                return {
                    'persons': [
                        test_person_rsp_0,
                        test_person_rsp_1
                    ]
                }
            }],
        ])
        const dispatch = jest.fn()
        await new GetTableAsyncAction('http://test').run(
            dispatch,
            new TableState({ columns: [] }))
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(new SetLoadingAction())
        expect(dispatch.mock.calls[1][0]).toEqual(
            new SetTableAction([test_person_rsp_0, test_person_rsp_1]))
    })

    test("loads table with chunks", async () => {
        const persons: any[] = []
        for (let i = 0; i < 100; ++i) {
            persons.push({})
        }
        responseSequence([
            [200, () => { return { 'count': 401 } }],
            [200, () => { return { 'persons': persons } }],
            [200, () => { return { 'persons': persons } }],
            [200, () => { return { 'persons': persons } }],
            [200, () => { return { 'persons': persons } }],
            [200, () => { return { 'persons': [{}] } }],
        ])
        const dispatch = jest.fn()
        await new GetTableAsyncAction('http://test').run(
            dispatch,
            new TableState({ columns: [] }))
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(new SetLoadingAction())
        expect(dispatch.mock.calls[1][0].row_objects.length).toEqual(401)
    })

    test("load count error code", async () => {
        responseSequence([
            [400, () => {
                return {
                    'msg': 'test error'
                }
            }],
        ])
        const dispatch = jest.fn()
        await new GetTableAsyncAction("http://test").run(
            dispatch,
            new TableState({ columns: [] }))
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(new SetLoadingAction())
        expect(dispatch.mock.calls[1][0]).toEqual(
            new SetErrorAction(
                'Could not get number of table entries.'
                + 'Reason: "test error"'))
    })

    test('load count exception', async () => {
        responseSequence([
            [400, () => {
                throw Error("test error")
            }],
        ])
        const dispatch = jest.fn()
        await new GetTableAsyncAction('http://test').run(
            dispatch,
            new TableState({ columns: [] }))
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(new SetLoadingAction())
        expect(dispatch.mock.calls[1][0]).toEqual(new SetErrorAction('test error'))
    })

    test("load chunk error code", async () => {
        responseSequence([
            [200, () => { return { "count": 2 } }],
            [400, () => {
                return {
                    "msg": 'test error'
                }
            }],
        ])
        const dispatch = jest.fn()
        await new GetTableAsyncAction('http://test').run(
            dispatch,
            new TableState({ columns: [] }))
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(new SetLoadingAction())
        expect(dispatch.mock.calls[1][0]).toEqual(
            new SetErrorAction('Could not load chunk 0. Reason: \"test error\"'))
    })

    test('load chunk exception', async () => {
        responseSequence([
            [200, () => { return { "count": 2 } }],
            [400, () => {
                throw Error("test error")
            }],
        ])
        const dispatch = jest.fn()
        await new GetTableAsyncAction('http://test').run(
            dispatch,
            new TableState({ columns: [] }))
        expect(dispatch.mock.calls.length).toBe(2)
        expect(dispatch.mock.calls[0][0]).toEqual(new SetLoadingAction())
        expect(dispatch.mock.calls[1][0]).toEqual(new SetErrorAction('test error'))
    })
})
