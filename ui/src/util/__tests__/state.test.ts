/*eslint @typescript-eslint/no-unused-vars: ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]*/
import { vi, Mock } from 'vitest'
import { Dispatch, useCallback, useReducer } from 'react'
import { Remote, useThunkReducer } from '../state'
import { AsyncAction } from '../async_action'
import { AppDispatch } from '../../store'

vi.mock('react', async () => {
    const original = await vi.importActual('react')
    return {
        ...original,
        useReducer: vi.fn(),
        useCallback: vi.fn()
    }
})

vi.mock('../../user/hooks', async () => {
    const original = await vi.importActual('../../user/hooks')
    return {
        ...original,
        useLogoutCallback: vi.fn()
    }
})

class CounterState {
    counter: number
    constructor(counter = 0) {
        this.counter = counter
    }
}
class AsyncActionTest extends AsyncAction<number, void> {
    async run(dispatch: Dispatch<number>, reduxDispatch: AppDispatch) {
        dispatch(5)
        reduxDispatch((_dispatch, _getState, _fetch) => 6)
    }
}
describe('thunker', () => {
    test('runs async action', () => {
        const dispatch = vi.fn()
        const reducer = vi.fn()
        const reduxDispatch = vi.fn()
        const state = new CounterState()
        ;(useReducer as Mock).mockReturnValueOnce([state, dispatch])
        ;(useCallback as Mock).mockImplementationOnce((fun, _state) => fun)
        const [_state, thunkDispatch] = useThunkReducer(reducer, state, reduxDispatch)
        thunkDispatch(new AsyncActionTest())
        expect(dispatch.mock.calls).toEqual([[5]])
        expect(reduxDispatch.mock.calls.length).toEqual(1)
        expect(reduxDispatch.mock.calls[0].length).toEqual(1)
        const result = reduxDispatch.mock.calls[0][0](undefined, undefined, undefined)
        expect(result).toEqual(6)
    })
    test('dispatches normal action', () => {
        const dispatch = vi.fn()
        const reducer = vi.fn()
        const reduxDispatch = vi.fn()
        const state = new CounterState()
        ;(useReducer as Mock).mockReturnValueOnce([state, dispatch])
        ;(useCallback as Mock).mockImplementationOnce((fun, _state) => fun)
        const [_state, thunkDispatch] = useThunkReducer(reducer, state, reduxDispatch)
        thunkDispatch(2)
        expect(dispatch.mock.calls).toEqual([[2]])
        expect(reducer.mock.calls).toEqual([])
        expect(reduxDispatch.mock.calls).toEqual([])
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
