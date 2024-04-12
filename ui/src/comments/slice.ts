import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { newRemote, RemoteInterface } from '../util/state'

export interface Comment {
    content: string
}
export interface CommentsRegister {
    commentsByIdPersistent: {
        [key: string]: RemoteInterface<Comment[]>
    }
    isSubmitting: boolean
}

const initialState: CommentsRegister = {
    commentsByIdPersistent: {},
    isSubmitting: false
}

const commentsSlice = createSlice({
    name: 'comments',
    initialState,
    reducers: {
        loadCommentsStart(state: CommentsRegister, action: PayloadAction<string[]>) {
            for (const idPersistent of action.payload) {
                state.commentsByIdPersistent[idPersistent] = newRemote([], true)
            }
        },
        loadCommentsSuccess(
            state: CommentsRegister,
            action: PayloadAction<{ [key: string]: Comment[] }>
        ) {
            for (const [idPersistent, comments] of Object.entries(action.payload)) {
                state.commentsByIdPersistent[idPersistent] = newRemote(comments)
            }
        },
        loadCommentsError(state: CommentsRegister, action: PayloadAction<string[]>) {
            for (const idPersistent of action.payload) {
                state.commentsByIdPersistent[idPersistent].isLoading = false
            }
        },
        clearComments(state: CommentsRegister, action: PayloadAction<string[]>) {
            for (const idPersistent of action.payload) {
                delete state.commentsByIdPersistent[idPersistent]
            }
        },
        submitCommentStart(state: CommentsRegister) {
            state.isSubmitting = true
        },
        submitCommentSuccess(
            state: CommentsRegister,
            action: PayloadAction<{ idPersistent: string; comment: Comment }>
        ) {
            state.isSubmitting = false
            try {
                state.commentsByIdPersistent[action.payload.idPersistent].value.push(
                    action.payload.comment
                )
            } catch (_e: unknown) {
                state.commentsByIdPersistent[action.payload.idPersistent] = newRemote([
                    action.payload.comment
                ])
            }
        },
        submitCommentError(state: CommentsRegister) {
            state.isSubmitting = false
        }
    }
})

export const commentsReducer = commentsSlice.reducer

export const {
    clearComments,
    loadCommentsStart,
    loadCommentsSuccess,
    loadCommentsError,
    submitCommentStart,
    submitCommentSuccess,
    submitCommentError
} = commentsSlice.actions
