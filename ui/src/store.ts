import { configureStore } from '@reduxjs/toolkit'
import { errorSlice } from './util/error/slice'

const store = configureStore({
    reducer: { error: errorSlice.reducer }
})

export default store

export type RootState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch
