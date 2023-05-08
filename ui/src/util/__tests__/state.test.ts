/*eslint @typescript-eslint/no-unused-vars: ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]*/
import { describe } from '@jest/globals'
import { Dispatch, useCallback, useReducer } from 'react'
import { Remote, useThunkReducer } from '../state'
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

describe('remote', () => {
    test('sets loading', () => {
        const initialRemote = new Remote<number[]>([], false, 'error')
        const expectedRemote = new Remote<number[]>([], true)
        const receivedRemote = initialRemote.startLoading()
        expect(receivedRemote).toEqual(expectedRemote)
    })
    test('sets success', () => {
        const initialRemote = new Remote<number[]>([], true)
        const expectedRemote = new Remote<number[]>([1, 2, 4])
        const receivedRemote = initialRemote.success([1, 2, 4])
        expect(receivedRemote).toEqual(expectedRemote)
    })
    test('sets error when loading', () => {
        const initialRemote = new Remote<number[]>([], true)
        const expectedRemote = new Remote<number[]>([], false, 'error')
        const receivedRemote = initialRemote.withError('error')
        expect(receivedRemote).toEqual(expectedRemote)
    })
    test('sets error when not loading', () => {
        const initialRemote = new Remote<number[]>([])
        const expectedRemote = new Remote<number[]>([], false, 'error')
        const receivedRemote = initialRemote.withError('error')
        expect(receivedRemote).toEqual(expectedRemote)
    })
    test('clears error', () => {
        const initialRemote = new Remote<number[]>([], false, 'error')
        const expectedRemote = new Remote<number[]>([], false)
        const receivedRemote = initialRemote.withoutError()
        expect(receivedRemote).toEqual(expectedRemote)
    })
})
