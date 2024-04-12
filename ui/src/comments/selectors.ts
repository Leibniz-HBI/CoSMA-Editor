import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'

function selectCommentsRegister(state: RootState) {
    return state.comments
}

export function selectComments(idPersistent: string) {
    return createSelector(
        selectCommentsRegister,
        (state) => state.commentsByIdPersistent[idPersistent]
    )
}

export function selectCommentsIsLoading(idPersistent: string) {
    return createSelector(
        selectComments(idPersistent),
        (state) => state?.isLoading ?? false
    )
}
