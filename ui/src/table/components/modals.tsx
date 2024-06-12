import { Col, Modal, ModalBody, Row } from 'react-bootstrap'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { EntityMergeRequestConflictComponent } from '../../merge_request/entity/conflicts/components'
import {
    selectEntityAddState,
    selectEntityJustificationHistory,
    selectEntityJustificationHistoryForIdPersistent,
    selectShowColumnMenu,
    selectShowEntityAddMenu,
    selectShowEntityMerging,
    selectShowEntityJustifications
} from '../selectors'
import {
    clearEntityJustificationHistory,
    hideColumnAddMenu,
    hideEntityAdd,
    hideEntityJustificationHistory,
    removeColumnByIdPersistent,
    toggleEntityMergingModal
} from '../slice'
import {
    entityChangeOrCreate,
    getColumnAsync,
    getTableAsync,
    loadEntityJustificationHistoryThunk,
    submitEntityJustificationThunk
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
import { justificationColumnId } from '../state'

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
                    addEntityCallback={(displayTxt, justification) =>
                        dispatch(
                            entityChangeOrCreate({
                                displayTxt,
                                justificationTxt: justification
                            })
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
    const justificationsShown = useAppSelector(selectShowEntityJustifications)
    const showColumnMenu = useAppSelector(selectShowColumnMenu)
    const additionalIndices: { [key: string]: number } = {}
    if (justificationsShown) {
        additionalIndices[justificationColumnId] = 1
    }
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
                    additionalEntries={[
                        { idPersistent: justificationColumnId, name: 'Justification' }
                    ]}
                    additionalIndices={additionalIndices}
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

export function EntityJustificationModal() {
    const remoteIdPersistent = useAppSelector(
        selectEntityJustificationHistoryForIdPersistent
    )
    const idPersistent = remoteIdPersistent.value
    const dispatch = useAppDispatch()
    return (
        <Modal
            show={idPersistent !== undefined}
            className="overflow-hidden"
            onHide={() => dispatch(hideEntityJustificationHistory())}
            size="xl"
        >
            <Modal.Header closeButton>
                <Modal.Title>Entity Justification History</Modal.Title>
            </Modal.Header>
            <ModalBody className="vh-85 overflow-hide">
                {idPersistent !== undefined && (
                    <EntityJustificationBody idPersistent={idPersistent} />
                )}
            </ModalBody>
        </Modal>
    )
}
export function EntityJustificationBody({ idPersistent }: { idPersistent: string }) {
    const comments = useAppSelector(selectEntityJustificationHistory)
    const dispatch = useAppDispatch()
    const submitCommentCallback = (commentTxt: string) =>
        dispatch(submitEntityJustificationThunk(idPersistent, commentTxt))
    useEffect(() => {
        if (comments === undefined || !comments.isLoading) {
            dispatch(loadEntityJustificationHistoryThunk(idPersistent))
        }
        return () => {
            dispatch(clearEntityJustificationHistory())
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
