import { Button, Col, ListGroup, Row } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../hooks'
import { CosmaeLoading, CosmaeCard } from '../util/components/misc'
import { selectComments } from './selectors'
import { Comment } from './slice'
import { FormField } from '../util/form'
import { ChangeEvent, useEffect, useState } from 'react'
import { loadCommentsThunk, submitComment } from './thunks'
import { RemoteInterface } from '../util/state'

export function CommentHistoryAndForm({ idPersistent }: { idPersistent: string }) {
    const comments = useAppSelector(selectComments(idPersistent))
    const dispatch = useAppDispatch()
    const submitCommentCallback = (commentTxt: string) =>
        dispatch(submitComment(idPersistent, commentTxt))
    useEffect(() => {
        if (comments === undefined || !comments.isLoading) {
            dispatch(loadCommentsThunk([idPersistent]))
        }
    }, [idPersistent])
    return (
        <Row className="ms-4 me-3 overflow-y-auto scroll-gutter flex-grow-1 flex-shrink-1">
            <Col xs={0} md={2} />
            <Col>
                <div>
                    <CommentsHistory comments={comments} />
                </div>
                <div>
                    <CommentForm submitComment={submitCommentCallback} />
                </div>
            </Col>
            <Col xs={0} md={2} />
        </Row>
    )
}

export function CommentsHistory({
    comments
}: {
    comments: RemoteInterface<Comment[]>
}) {
    if (comments === undefined || comments.isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ListGroup>
            {comments.value.map((comment, idx) => (
                <CommentElement comment={comment} key={idx} />
            ))}
        </ListGroup>
    )
}

export function CommentElement({ comment }: { comment: Comment }) {
    return (
        <Row>
            <Col className="ms-2 me-2 mb-2 mt-1">
                <CosmaeCard
                    header={
                        <Row className="justify-content-between">
                            <Col xs={3}>
                                <span>Author: </span>
                                <span className="fw-semibold">
                                    {comment.author.username}
                                </span>
                            </Col>
                            <Col xs={3} className="text-end">
                                <span>{comment.timestamp.toLocaleString()}</span>
                            </Col>
                        </Row>
                    }
                    bodyClassName="d-flex"
                >
                    <div className="ps-2 pe-2 bg-light">{comment.content}</div>
                </CosmaeCard>
            </Col>
        </Row>
    )
}

export function CommentForm({
    submitComment
}: {
    submitComment: (commentTxt: string) => Promise<boolean>
}) {
    const [commentContent, setCommentContents] = useState('')
    return (
        <Col className="ps-2 pe-3">
            <FormField
                label="New Comment"
                handleChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setCommentContents(event.target.value ?? '')
                }
                value={commentContent}
                name="New Comment"
                as="textarea"
                className="min-h-200px"
            />
            <Row className="justify-content-end">
                <Col xs="auto">
                    <Button
                        onClick={() => {
                            submitComment(commentContent).then((result) => {
                                if (result) {
                                    setCommentContents('')
                                }
                            })
                        }}
                    >
                        Submit
                    </Button>
                </Col>
            </Row>
        </Col>
    )
}
