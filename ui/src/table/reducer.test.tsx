import { describe, expect, test } from '@jest/globals';
import { SetLoadingAction, SetErrorAction, SetTableAction } from './actions';
import { tableReducer } from "./reducer"
import { TableState } from './state';
describe("reducer tests", () => {
    test("init to loading", () => {
        const state = new TableState({ columns: [] })
        const end_state = tableReducer(state, new SetLoadingAction())
        const expected_state = new TableState({ columns: [], isLoading: true })
        expect(end_state).toEqual(expected_state)
    })
    test("loading to error", () => {
        const state = new TableState({ columns: [], isLoading: true })
        const end_state = tableReducer(state, new SetErrorAction("test error"))
        const expected_state = new TableState(
            { columns: [], isLoading: false, errorMsg: "test error" })
        expect(end_state).toEqual(expected_state)
    })
    test("loading to success", () => {
        const state = new TableState({ columns: [], isLoading: true })
        const row_objects = [{a: 1, b:3}, {a:2, b:4}]
        const end_state = tableReducer(state, new SetTableAction(row_objects))
        const expected_state = new TableState(
            { columns: [], isLoading: false, row_objects: row_objects })
        expect(end_state).toEqual(expected_state)
    })
    test("error to loading", () => {
        const state = new TableState({ columns: [], errorMsg: "test error" })
        const end_state = tableReducer(state, new SetLoadingAction())
        const expected_state = new TableState(
            { columns: [], isLoading: true })
        expect(end_state).toEqual(expected_state)
    })
    test("reload", () => {
        const row_objects = [{a: 1, b:3}, {a:2, b:4}]
        const state = new TableState({ columns: [], row_objects: row_objects })
        const end_state = tableReducer(state, new SetLoadingAction())
        const expected_state = new TableState(
            { columns: [], isLoading: true, row_objects: row_objects })
        expect(end_state).toEqual(expected_state)
    })
})
