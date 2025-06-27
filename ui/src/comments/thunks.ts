import { config } from '../config'
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
    return async (dispatch, _getState, fetch) => {
        dispatch(loadCommentsStart(idPersistentList))
        try {
            const rsp = await fetch(config.api_path + '/comments', {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({ id_persistent_list: idPersistentList })
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                const comments = Object.fromEntries(
                    Object.entries(json['comments_by_id_persistent']).map(
                        (entry) => [
                            entry[0],
                            (entry[1] as unknown[]).map((comment) =>
                                parseCommentFromApi(comment)
                            )
                        ]
                    )
                )
                dispatch(loadCommentsSuccess(comments))
            } else {
                dispatch(addError(errorMessageFromApi(json)))
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
    return async (dispatch, _getState, fetch) => {
        dispatch(submitCommentStart())
        try {
            const rsp = await fetch(config.api_path + `/comments/${idPersistent}`, {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({ comment: { content } })
            })
            const json = await rsp.json()
            if (rsp.status == 200) {
                dispatch(
                    submitCommentSuccess({
                        idPersistent,
                        comment: parseCommentFromApi(json['comment'])
                    })
                )
                return true
            }
            dispatch(addError(errorMessageFromApi(json)))
            dispatch(submitCommentError())
        } catch (e: unknown) {
            dispatch(addError(exceptionMessage(e)))
            dispatch(submitCommentError())
        }
        return false
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCommentFromApi(commentJson: any): Comment {
    return {
        content: commentJson['content'],
        author: parsePublicUserInfoFromJson(commentJson['author']),
        timestamp: new Date(commentJson['timestamp'])
    }
}
