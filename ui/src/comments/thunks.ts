import {
    Comment as CommentApi,
    cosmaeCommentsApiPostComment,
    cosmaeCommentsApiPostGetComments
} from '../openapi/cosmae'
import { parsePublicUserInfoFromJson } from '../user/thunks'
import { errorMessageFromApi, exceptionMessage } from '../util/exception'
import { addError } from '../util/notification/slice'
import { ThunkWithFetch } from '../util/type'
import {
    Comment,
    loadCommentsError,
    loadCommentsStart,
    loadCommentsSuccess,
    submitCommentError,
    submitCommentStart,
    submitCommentSuccess
} from './slice'

export function loadCommentsThunk(idPersistentList: string[]): ThunkWithFetch<void> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(loadCommentsStart(idPersistentList))
        try {
            const rsp = await cosmaeCommentsApiPostGetComments({
                body: { id_persistent_list: idPersistentList }
            })
            if (rsp.data) {
                const comments = Object.fromEntries(
                    Object.entries(rsp.data.comments_by_id_persistent).map((entry) => [
                        entry[0],
                        entry[1].map((comment) => parseCommentFromApi(comment))
                    ])
                )
                dispatch(loadCommentsSuccess(comments))
            } else {
                dispatch(addError(errorMessageFromApi(rsp.error)))
                dispatch(loadCommentsError(idPersistentList))
            }
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(loadCommentsError(idPersistentList))
        }
    }
}

export function submitComment(
    idPersistent: string,
    content: string
): ThunkWithFetch<boolean> {
    return async (dispatch, _getState, _fetch) => {
        dispatch(submitCommentStart())
        try {
            const rsp = await cosmaeCommentsApiPostComment({
                path: { relates_to_id_persistent: idPersistent },
                body: { comment: { content } }
            })
            if (rsp.data) {
                dispatch(
                    submitCommentSuccess({
                        idPersistent,
                        comment: parseCommentFromApi(rsp.data.comment)
                    })
                )
                return true
            }
            dispatch(addError(errorMessageFromApi(rsp.error)))
            dispatch(submitCommentError())
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(submitCommentError())
        }
        return false
    }
}

export function parseCommentFromApi(commentApi: CommentApi): Comment {
    return {
        content: commentApi.content,
        author: parsePublicUserInfoFromJson(commentApi.author),
        timestamp: new Date(commentApi.timestamp)
    }
}
