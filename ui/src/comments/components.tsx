import { Button, Col, ListGroup, Row } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../hooks'
import { CosmaeLoading, CosmaeCard } from '../util/components/misc'
import { selectComments, selectCommentsIsLoading } from './selectors'
import { Comment } from './slice'
import { FormField } from '../util/form'
import { ChangeEvent, useEffect, useState } from 'react'
import { loadCommentsThunk, submitComment } from './thunks'

export function CommentHistoryAndForm({ idPersistent }: { idPersistent: string }) {
    const isLoadingComments = useAppSelector(selectCommentsIsLoading(idPersistent))
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (!isLoadingComments) {
            dispatch(loadCommentsThunk([idPersistent]))
        }
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idPersistent])
    return (
        <Col className="ms-4 me-3 overflow-y-auto scroll-gutter ">
            <Row>
                <CommentsHistory idPersistent={idPersistent} />
            </Row>
            <Row>
                <CommentForm idPersistent={idPersistent} />
            </Row>
        </Col>
    )
}

export function CommentsHistory({ idPersistent }: { idPersistent: string }) {
    const comments = useAppSelector(selectComments(idPersistent))
    if (comments === undefined || comments.isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ListGroup>
            {comments.value.map((comment) => (
                <CommentElement comment={comment} />
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
                >
                    <div className="ms-2 me-2">{comment.content}</div>
                </CosmaeCard>
            </Col>
        </Row>
    )
}

export function CommentForm({ idPersistent }: { idPersistent: string }) {
    const dispatch = useAppDispatch()
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
                            dispatch(submitComment(idPersistent, commentContent)).then(
                                (result) => {
                                    if (result) {
                                        setCommentContents('')
                                    }
                                }
                            )
                        }}
                    >
                        Submit
                    </Button>
                </Col>
            </Row>
        </Col>
    )
}
