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
import { AddEntityForm, EntityDetails } from '../../entity/components'
import { ColumnMenu } from '../../column_menu/components/menu'
import { Column } from '../../column_menu/state'
import {
    remoteUserProfileColumnAppend,
    remoteUserProfileColumnDeleteAsync
} from '../../user/thunks'
import { useEffect } from 'react'
import { CommentForm, CommentsHistory } from '../../comments/components'
import { justificationColumnId } from '../state'
import { clearSelection } from '../selection/slice'
import { selectShowDetailsForEntityWithIdPersistent } from '../../entity/selectors'
import { setShowDetailsForEntityWithIdPersistent } from '../../entity/slice'
import { useEntity } from '../../entity/hooks'
import { constructColumnTitle } from '../../contribution/entity/hooks'

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
    columnIndices,
    upUntilDate = undefined
}: {
    columnIndices: { [key: string]: number }
    upUntilDate?: Date | undefined
}) {
    const dispatch = useAppDispatch()
    const showColumnMenu = useAppSelector(selectShowColumnMenu)
    return (
        <Modal
            show={showColumnMenu}
            onHide={() => dispatch(hideColumnAddMenu())}
            size="xl"
            key="column-menu-modal"
            className="overflow-hidden"
            contentClassName="vh-95 d-flex flex-column bg-secondary flex-sm-wrap flex-md-nowrap"
        >
            <Modal.Header closeButton className="flex-grow-0 flex-shrink-0 bg-white">
                <Modal.Title className="text-dark">Show Additional Values</Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-secondary d-contents">
                <ColumnMenu
                    columnIndices={columnIndices}
                    loadColumnDataCallback={(columnDefinition: Column) =>
                        dispatch(getColumnAsync(columnDefinition, upUntilDate)).then(
                            async (idColumnList) => {
                                for (const idPersistent of idColumnList) {
                                    await dispatch(
                                        remoteUserProfileColumnAppend(idPersistent)
                                    )
                                }
                            }
                        )
                    }
                    upUntilDate={upUntilDate}
                    hideColumnDataCallback={(columnDefinition: Column) =>
                        dispatch(
                            remoteUserProfileColumnDeleteAsync(
                                columnDefinition.idPersistent
                            )
                        ).then(() => {
                            dispatch(clearSelection())
                            dispatch(
                                removeColumnByIdPersistent(
                                    columnDefinition.idPersistent
                                )
                            )
                        })
                    }
                />
            </Modal.Body>
        </Modal>
    )
}

export function EntityJustificationModal({
    upUntilTime
}: {
    upUntilTime: Date | undefined
}) {
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
                    <EntityJustificationBody
                        idPersistent={idPersistent}
                        upUntilTime={upUntilTime}
                    />
                )}
            </ModalBody>
        </Modal>
    )
}
export function EntityJustificationBody({
    idPersistent,
    upUntilTime
}: {
    idPersistent: string
    upUntilTime: Date | undefined
}) {
    const comments = useAppSelector(selectEntityJustificationHistory)
    const dispatch = useAppDispatch()
    const submitCommentCallback = (commentTxt: string) =>
        dispatch(submitEntityJustificationThunk(idPersistent, commentTxt))
    useEffect(() => {
        if (comments === undefined || !comments.isLoading) {
            dispatch(loadEntityJustificationHistoryThunk(idPersistent, upUntilTime))
        }
        return () => {
            dispatch(clearEntityJustificationHistory())
        }
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
export function EntityDetailsModal({ upUntilTime }: { upUntilTime: Date | undefined }) {
    const dispatch = useAppDispatch()
    const idEntityPersistent = useAppSelector(
        selectShowDetailsForEntityWithIdPersistent
    )
    const showEntityDetailsModal = idEntityPersistent !== undefined
    return (
        <Modal
            show={showEntityDetailsModal}
            onHide={() => dispatch(setShowDetailsForEntityWithIdPersistent(undefined))}
            size="xl"
            // fullscreen={true}
            key="entity-merging-modal"
        >
            <Modal.Header closeButton={true}>
                <Modal.Title>Entity Details</Modal.Title>
            </Modal.Header>
            <Modal.Body className="display-block vh-95">
                {showEntityDetailsModal ? (
                    <EntityDetails
                        idEntityPersistent={idEntityPersistent}
                        upUntilTime={upUntilTime}
                    />
                ) : (
                    <div />
                )}
            </Modal.Body>
        </Modal>
    )
}

export function DisplayTextDetails({
    idEntityPersistent,
    upUntilTime
}: {
    idEntityPersistent: string
    upUntilTime: Date | undefined
}) {
    const entity = useEntity(idEntityPersistent, upUntilTime).value
    let tooltipValue = 'Unknown entity'
    if (entity !== undefined) {
        const displayTxtDetails = entity.displayTxtDetails
        if (displayTxtDetails === undefined) {
            tooltipValue = 'Unknown display txt source'
        } else if (typeof displayTxtDetails == 'string') {
            tooltipValue = displayTxtDetails
        } else {
            tooltipValue = constructColumnTitle(displayTxtDetails.namePath)
        }
    }
    return <div>{`Display text source: ${tooltipValue}`}</div>
}
