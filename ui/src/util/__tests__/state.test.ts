/*eslint @typescript-eslint/no-unused-vars: ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]*/
import { describe } from '@jest/globals'
import { Dispatch, useCallback, useReducer } from 'react'
import { useThunkReducer } from '../state'
import { AsyncAction } from '../async_action'

jest.mock('react', () => {
    const original = jest.requireActual('react')
    return {
        ...original,
        useReducer: jest.fn(),
        useCallback: jest.fn()
    }
})

jest.mock('../../user/hooks', () => {
    const original = jest.requireActual('../../user/hooks')
    return {
        ...original,
        useLogoutCallback: jest.fn()
    }
})

class CounterState {
    counter: number
    constructor(counter = 0) {
        this.counter = counter
    }
}
class AsyncActionTest extends AsyncAction<number, void> {
    async run(dispatch: Dispatch<number>) {
        dispatch(5)
    }
}
describe('thunker', () => {
    test('runs async action', () => {
        const dispatch = jest.fn()
        const reducer = jest.fn()
        const state = new CounterState()
        ;(useReducer as jest.Mock).mockReturnValueOnce([state, dispatch])
        ;(useCallback as jest.Mock).mockImplementationOnce((fun, _state) => fun)
        const [_state, thunkDispatch] = useThunkReducer(reducer, state)
        thunkDispatch(new AsyncActionTest())
        expect(dispatch.mock.calls).toEqual([[5]])
    })
    test('dispatches normal action', () => {
        const dispatch = jest.fn()
        const reducer = jest.fn()
        const state = new CounterState()
        ;(useReducer as jest.Mock).mockReturnValueOnce([state, dispatch])
        ;(useCallback as jest.Mock).mockImplementationOnce((fun, _state) => fun)
        const [_state, thunkDispatch] = useThunkReducer(reducer, state)
        thunkDispatch(2)
        expect(dispatch.mock.calls).toEqual([[2]])
        expect(reducer.mock.calls).toEqual([])
    })
})
