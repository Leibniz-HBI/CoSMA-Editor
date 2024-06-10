import { Col, Modal, ModalBody, Row } from 'react-bootstrap'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { EntityMergeRequestConflictComponent } from '../../merge_request/entity/conflicts/components'
import {
    selectEntityAddState,
    selectEntityReasonHistory,
    selectEntityReasonHistoryForIdPersistent,
    selectShowColumnMenu,
    selectShowEntityAddMenu,
    selectShowEntityMerging
} from '../selectors'
import {
    clearEntityReasonHistory,
    hideColumnAddMenu,
    hideEntityAdd,
    hideEntityReasonHistory,
    removeColumnByIdPersistent,
    toggleEntityMergingModal
} from '../slice'
import {
    entityChangeOrCreate,
    getColumnAsync,
    getTableAsync,
    loadEntityReasonHistoryThunk,
    submitEntityReasonThunk
} from '../thunks'
import { AddEntityForm } from '../../entity/components'
import { ColumnMenu } from '../../column_menu/components/menu'
import { TagDefinition } from '../../column_menu/state'
import {
    remoteUserProfileColumnAppend,
    remoteUserProfileColumnDeleteAsync
} from '../../user/thunks'
import { useEffect } from 'react'
import { CommentForm, CommentsHistory } from '../../comments/components'

export function EntityMergingModal() {
    const dispatch = useAppDispatch()
    const showEntityMergingModal = useAppSelector(selectShowEntityMerging)
    return (
        <Modal
            show={showEntityMergingModal}
            onHide={() => dispatch(toggleEntityMergingModal(false))}
            size="xl"
            // fullscreen={true}
            key="entity-merging-modal"
        >
            <Modal.Header closeButton={true}>
                <Modal.Title>Merge Entities</Modal.Title>
            </Modal.Header>
            <Modal.Body className="display-block vh-95">
                <EntityMergeRequestConflictComponent
                    loadDataCallback={() => dispatch(getTableAsync())}
                />
            </Modal.Body>
        </Modal>
    )
}
export function EntityAddModal() {
    const dispatch = useAppDispatch()
    const showEntityAddMenu = useAppSelector(selectShowEntityAddMenu)
    const entityAddState = useAppSelector(selectEntityAddState)
    return (
        <Modal
            show={showEntityAddMenu}
            onHide={() => dispatch(hideEntityAdd())}
            size="xl"
            key="entity-add-modal"
        >
            <Modal.Header closeButton={true}>
                <Modal.Title>Add new Entity</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <AddEntityForm
                    state={entityAddState}
                    addEntityCallback={(displayTxt, reason) =>
                        dispatch(
                            entityChangeOrCreate({ displayTxt, reasonTxt: reason })
                        )
                    }
                />
            </Modal.Body>
        </Modal>
    )
}

export function ColumnModal({
    columnIndices
}: {
    columnIndices: { [key: string]: number }
}) {
    const dispatch = useAppDispatch()
    const showColumnMenu = useAppSelector(selectShowColumnMenu)
    return (
        <Modal
            show={showColumnMenu}
            onHide={() => dispatch(hideColumnAddMenu())}
            size="xl"
            key="column-menu-modal"
            className="h-100 overflow-hidden"
        >
            <Modal.Header closeButton>
                <Modal.Title className="text-dark">
                    Show Additional Tag Values
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-secondary vh-85">
                <ColumnMenu
                    columnIndices={columnIndices}
                    loadColumnDataCallback={(columnDefinition: TagDefinition) =>
                        dispatch(getColumnAsync(columnDefinition)).then(() =>
                            dispatch(
                                remoteUserProfileColumnAppend(
                                    columnDefinition.idPersistent
                                )
                            )
                        )
                    }
                    hideColumnDataCallback={(columnDefinition: TagDefinition) =>
                        dispatch(
                            remoteUserProfileColumnDeleteAsync(
                                columnDefinition.idPersistent
                            )
                        ).then(() =>
                            dispatch(
                                removeColumnByIdPersistent(
                                    columnDefinition.idPersistent
                                )
                            )
                        )
                    }
                />
            </Modal.Body>
        </Modal>
    )
}

export function EntityReasonModal() {
    const remoteIdPersistent = useAppSelector(selectEntityReasonHistoryForIdPersistent)
    const idPersistent = remoteIdPersistent.value
    const dispatch = useAppDispatch()
    return (
        <Modal
            show={idPersistent !== undefined}
            className="overflow-hidden"
            onHide={() => dispatch(hideEntityReasonHistory())}
            size="xl"
        >
            <Modal.Header closeButton>
                <Modal.Title>Entity Reason History</Modal.Title>
            </Modal.Header>
            <ModalBody className="vh-85 overflow-hide">
                {idPersistent !== undefined && (
                    <EntityReasonBody idPersistent={idPersistent} />
                )}
            </ModalBody>
        </Modal>
    )
}
export function EntityReasonBody({ idPersistent }: { idPersistent: string }) {
    const comments = useAppSelector(selectEntityReasonHistory)
    const dispatch = useAppDispatch()
    const submitCommentCallback = (commentTxt: string) =>
        dispatch(submitEntityReasonThunk(idPersistent, commentTxt))
    useEffect(() => {
        if (comments === undefined || !comments.isLoading) {
            dispatch(loadEntityReasonHistoryThunk(idPersistent))
        }
        return () => {
            dispatch(clearEntityReasonHistory())
        }
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idPersistent])
    return (
        <Row className="h-100 overflow-y-hide">
            <Col className="h-100 ms-4 me-3 overflow-y-hidden d-flex flex-column">
                <Row className="flex-grow-1 scroll-gutter overflow-y-scroll mb-4">
                    <CommentsHistory comments={comments} />
                </Row>
                <Row className="flex-grow-0 flex-shrink-1">
                    <CommentForm submitComment={submitCommentCallback} />
                </Row>
            </Col>
        </Row>
    )
}
