import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { v4 as uuid4 } from 'uuid'
import { AppDispatch, RootState } from '../../store'

export class ErrorState {
    id: string
    msg: string
    retryCallback?: VoidFunction

    constructor(msg: string, retryCallback?: VoidFunction, id?: string) {
        this.msg = msg
        this.retryCallback = retryCallback
        if (id === undefined) {
            this.id = uuid4()
        } else {
            this.id = id
        }
    }
}

export interface ErrorManager {
    errorList: ErrorState[]
    errorMap: { [key: string]: number }
}

const initialState: ErrorManager = {
    errorList: [],
    errorMap: {}
}

export const errorSlice = createSlice({
    initialState,
    name: 'error',
    reducers: {
        addError: (state: ErrorManager, action: PayloadAction<ErrorState>) => {
            const errorState = action.payload
            state.errorMap[errorState.id] = state.errorList.length
            state.errorList.push(errorState)
        },
        removeError: (state: ErrorManager, action: PayloadAction<string>) => {
            const idx = state.errorMap[action.payload]
            delete state.errorMap[action.payload]
            if (idx !== undefined) {
                state.errorList.splice(idx, 1)
            }
        }
    }
})

export const { addError, removeError } = errorSlice.actions

export function addVanishingError(error: ErrorState, vanishDelay: number) {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (dispatch: AppDispatch) => {
        dispatch(addError(error))
        setTimeout(() => dispatch(removeError(error.id)), vanishDelay)
    }
}

export function errorListSelector(state: RootState): ErrorState[] {
    return state.error.errorList
}
