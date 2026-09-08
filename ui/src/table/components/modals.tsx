import { Button, Col, Modal, ModalBody, Row } from 'react-bootstrap'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { EntityMergeRequestConflictComponent } from '../../merge_request/entity/conflicts/components'
import {
    selectEntityAddState,
    selectEntityJustificationHistory,
    selectEntityJustificationHistoryForIdPersistent,
    selectShowColumnMenu,
    selectShowEntityAddMenu,
    selectShowEntityMerging,
    selectShowFilterEditor,
    selectShowMergeRequestForm
} from '../selectors'
import {
    addJustificationToOpenHistory,
    clearEntityJustificationHistory,
    hideColumnAddMenu,
    hideEntityAdd,
    hideEntityJustificationHistory,
    removeColumnByIdPersistent,
    setShowFilterEditor,
    setShowMergeRequestForm,
    toggleEntityMergingModal
} from '../slice'
import {
    entityChangeOrCreate,
    getColumnAsync,
    getTableAsync,
    loadEntityJustificationHistoryThunk
} from '../thunks'
import { AddEntityForm, EntityDetails } from '../../entity/components'
import { ColumnMenu } from '../../column_menu/components/menu'
import { Column, ColumnType } from '../../column_menu/state'
import {
    remoteUserProfileColumnAppendThunk,
    remoteUserProfileColumnDeleteThunk
} from '../../auth/thunks'
import { useEffect, useState } from 'react'
import { CommentForm, CommentsHistory } from '../../comments/components'
import { clearSelection } from '../selection/slice'
import { selectShowDetailsForEntityWithIdPersistent } from '../../entity/selectors'
import { setShowDetailsForEntityWithIdPersistent } from '../../entity/slice'
import { useEntity } from '../../entity/hooks'
import { constructColumnTitle } from '../../contribution/entity/hooks'
import { submitEntityJustificationThunk } from '../../entity/thunks'
import { FilterEditor } from './filter'
import { FilterClause } from '../state'
import * as yup from 'yup'
import { Formik } from 'formik'
import { ColumnNamePathFromId } from '../../column_menu/components/misc'
import { ColumnSelector } from '../../column_menu/components/selection'
import { loadColumnHierarchy } from '../../column_menu/thunks'
import { createColumnMergeRequestThunk } from '../../merge_request/thunks'

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
                        dispatch(
                            getColumnAsync(
                                columnDefinition.idPersistent,
                                upUntilDate,
                                columnDefinition.columnType
                            )
                        ).then(async (idColumnList) => {
                            for (const idPersistent of idColumnList) {
                                await dispatch(
                                    remoteUserProfileColumnAppendThunk(idPersistent)
                                )
                            }
                        })
                    }
                    upUntilDate={upUntilDate}
                    hideColumnDataCallback={(columnDefinition: Column) =>
                        dispatch(
                            remoteUserProfileColumnDeleteThunk(
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
        dispatch(submitEntityJustificationThunk(idPersistent, commentTxt)).then(
            (result) => {
                if (result.comment !== undefined) {
                    dispatch(addJustificationToOpenHistory(result.comment))
                    return true
                }
                return result.wasAdded
            }
        )
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

export function FilterModal({
    upUntilTime,
    setFilter,
    filter
}: {
    upUntilTime: Date | undefined
    setFilter: (filter: FilterClause | undefined) => void
    filter?: FilterClause | undefined
}) {
    const dispatch = useAppDispatch()
    const showFilterModal = useAppSelector(selectShowFilterEditor)
    return (
        <Modal
            show={showFilterModal}
            onHide={() => dispatch(setShowFilterEditor(false))}
            size="xl"
            // fullscreen={true}
            key="entity-merging-modal"
        >
            <Modal.Header closeButton={true}>
                <Modal.Title>Entity Details</Modal.Title>
            </Modal.Header>
            <Modal.Body className="display-block vh-85 overflow-y-hidden">
                {showFilterModal ? (
                    <FilterEditor
                        upUntilDate={upUntilTime}
                        onSubmit={setFilter}
                        filter={filter}
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

type MergeRequestFormData = {
    idOriginPersistent: string | undefined
    idDestinationPersistent: string | undefined
}

const mergeRequestFormSchema = yup.object({
    idOriginPersistent: yup.string().required('Origin column is required'),
    idDestinationPersistent: yup.string().required('Destination column is required')
})

export function ColumnMergeRequestModal() {
    const dispatch = useAppDispatch()
    const showMergeRequestForm = useAppSelector(selectShowMergeRequestForm)
    const initialValues: MergeRequestFormData = {
        idOriginPersistent: undefined,
        idDestinationPersistent: undefined
    }
    return (
        <Modal
            show={showMergeRequestForm}
            onHide={() => dispatch(setShowMergeRequestForm(false))}
            size="xl"
            // fullscreen={true}
            key="entity-merging-modal"
        >
            <Modal.Header closeButton={true}>
                <Modal.Title>Create Column Merge Request</Modal.Title>
            </Modal.Header>
            <Modal.Body className="display-block vh-85 overflow-y-hidden">
                <Formik
                    validationSchema={mergeRequestFormSchema}
                    initialValues={initialValues}
                    onSubmit={(values) => {
                        if (
                            values.idOriginPersistent === undefined ||
                            values.idDestinationPersistent === undefined
                        ) {
                            return
                        }
                        dispatch(
                            createColumnMergeRequestThunk(
                                values.idOriginPersistent,
                                values.idDestinationPersistent
                            )
                        )
                    }}
                >
                    {({ values, setValues, submitForm, errors }) => (
                        <ColumnMergeRequestModalBody
                            values={values}
                            setValues={setValues}
                            submit={submitForm}
                        />
                    )}
                </Formik>
            </Modal.Body>
        </Modal>
    )
}

function ColumnMergeRequestModalBody({
    values,
    setValues,
    submit
}: {
    values: MergeRequestFormData
    setValues: (values: MergeRequestFormData) => void
    submit: () => void
}) {
    const dispatch = useAppDispatch()
    useEffect(() => {
        dispatch(loadColumnHierarchy({ expand: true }))
    }, [])
    const [showOriginModal, setShowOriginModal] = useState(false)
    const [showDestinationModal, setShowDestinationModal] = useState(false)
    return (
        <>
            <Col>
                <Row className="mb-3">
                    <Col xs={2} className="justify-content-center d-flex">
                        <Button onClick={() => setShowOriginModal(true)}>
                            Select Origin
                        </Button>
                    </Col>
                    <Col className="ps-3">
                        {values.idOriginPersistent ? (
                            <ColumnNamePathFromId
                                idColumnPersistent={values.idOriginPersistent}
                            />
                        ) : (
                            <span>No origin column selected</span>
                        )}
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Col xs={2} className="justify-content-center d-flex">
                        <Button onClick={() => setShowDestinationModal(true)}>
                            Select Destination
                        </Button>
                    </Col>
                    <Col className="ps-3">
                        {values.idDestinationPersistent ? (
                            <ColumnNamePathFromId
                                idColumnPersistent={values.idDestinationPersistent}
                            />
                        ) : (
                            <span>No destination column selected</span>
                        )}
                    </Col>
                </Row>
                <Row className="mt-2">
                    <Col></Col>
                    <Col xs="auto">
                        <Button onClick={() => submit()}>Create</Button>
                    </Col>
                </Row>
            </Col>
            <SelectColumnModal
                key="select-origin-column-modal"
                show={showOriginModal}
                onHide={() => setShowOriginModal(false)}
                variant="Origin"
                selectCallback={(idPersistent) => {
                    // Need to close before redraw
                    setShowOriginModal(false)
                    setValues({ ...values, idOriginPersistent: idPersistent })
                }}
            />
            <SelectColumnModal
                key="select-destination-column-modal"
                show={showDestinationModal}
                onHide={() => setShowDestinationModal(false)}
                variant="Destination"
                selectCallback={(idPersistent) => {
                    // Need to close before redraw
                    setShowDestinationModal(false)
                    setValues({ ...values, idDestinationPersistent: idPersistent })
                }}
            />
        </>
    )
}

function SelectColumnModal({
    show,
    onHide,
    variant,
    selectCallback
}: {
    show: boolean
    onHide: () => void
    variant: 'Origin' | 'Destination'
    selectCallback: (idPersistent: string) => void
}) {
    return (
        <Modal
            show={show}
            onHide={onHide}
            size="xl"
            className="overflow-hidden"
            contentClassName="vh-95 d-flex flex-column bg-secondary flex-sm-wrap flex-md-nowrap"
        >
            <Modal.Header closeButton className="flex-grow-0 flex-shrink-0 bg-white">
                <Modal.Title className="text-dark">{`Select ${variant} Column`}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-secondary d-contents">
                <ColumnSelector
                    mkTailElement={(column: Column) => {
                        if (column.columnType === ColumnType.Inner) {
                            return <div />
                        }
                        return (
                            <Button
                                onClick={() => selectCallback(column.idPersistent)}
                                variant="outline-primary"
                            >
                                Select
                            </Button>
                        )
                    }}
                />
            </Modal.Body>
        </Modal>
    )
}
