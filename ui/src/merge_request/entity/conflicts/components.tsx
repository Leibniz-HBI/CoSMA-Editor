import { useDispatch, useSelector } from 'react-redux'
import {
    selectEntityMerge,
    selectEntityMergeRequest,
    selectEntityMergeRequestConflicts
} from './selectors'
import {
    Accordion,
    Button,
    Col,
    ListGroup,
    OverlayTrigger,
    Row,
    Tooltip
} from 'react-bootstrap'
import { EntityMergeRequestConflict } from './state'
import { EntityMergeRequest } from '../state'
import { RemoteInterface } from '../../../util/state'
import { constructColumnTitleSpans } from '../../../column_menu/components/selection'
import { ChoiceButton, RemoteTriggerButton } from '../../../util/components/misc'
import { useEffect } from 'react'
import { AppDispatch } from '../../../store'
import { ArrowLeftCircle, ArrowRightCircleFill } from 'react-bootstrap-icons'
import {
    resolveEntityConflict,
    getEntityMergeRequestConflicts,
    getEntityMergeRequest,
    reverseOriginDestination,
    mergeEntityMergeRequest
} from './thunks'
import { useLoaderData } from 'react-router-dom'
import { clearEntityMergeState } from './slice'

export function EntityMergeRequestConflictView() {
    const idMergeRequestPersistent = useLoaderData() as string
    const dispatch: AppDispatch = useDispatch()
    useEffect(
        () => {
            dispatch(getEntityMergeRequest(idMergeRequestPersistent))
        }, // eslint-disable-next-line react-hooks/exhaustive-deps
        [idMergeRequestPersistent]
    )
    return (
        <EntityMergeRequestConflictComponent
            loadDataCallback={() => {
                //do nothing
            }}
        />
    )
}

export function EntityMergeRequestConflictComponent({
    loadDataCallback
}: {
    loadDataCallback: VoidFunction
}) {
    const dispatch: AppDispatch = useDispatch()
    const mergeRequest = useSelector(selectEntityMergeRequest)
    const mergeState = useSelector(selectEntityMerge)
    const conflicts = useSelector(selectEntityMergeRequestConflicts)
    useEffect(() => {
        if (mergeRequest.value !== undefined) {
            dispatch(getEntityMergeRequestConflicts(mergeRequest.value?.idPersistent))
        }
        return () => {
            dispatch(clearEntityMergeState())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mergeRequest.value?.idPersistent])
    const conflictsValue = conflicts.value
    const mergeRequestValue = mergeRequest.value

    if (
        conflicts.isLoading ||
        conflictsValue === undefined ||
        mergeRequest.isLoading ||
        mergeRequestValue === undefined
    ) {
        return <div className=" shimmer" />
    }
    return (
        <Row className="h-100">
            <Col className="h-100 overflow-hidden d-flex flex-column ps-5 pe-5">
                <Row key="merge-button-row">
                    <Col xs="auto">
                        <RemoteTriggerButton
                            label="Apply Resolutions to Destination"
                            onClick={() =>
                                dispatch(
                                    mergeEntityMergeRequest(
                                        mergeRequestValue.idPersistent
                                    )
                                ).then(loadDataCallback)
                            }
                            isLoading={
                                (mergeState.value == mergeRequestValue.idPersistent,
                                mergeState.isLoading)
                            }
                        />
                    </Col>
                    <Col>
                        <EntityMergeRequestConflictHeader
                            mergeRequest={mergeRequestValue}
                        />
                    </Col>
                </Row>
                <Row
                    className="mt-2 h-100 overflow-y-scroll flex-basis-0 flex-grow-1"
                    key="conflicts-row"
                >
                    <Accordion defaultActiveKey={['0', '1']} alwaysOpen={true}>
                        {conflictsValue.updated.length > 0 && (
                            <Accordion.Item eventKey="0">
                                <Accordion.Header>
                                    For the following conflicts the underlying data has
                                    changed
                                </Accordion.Header>
                                <Accordion.Body>
                                    <ListGroup key="merge-request-conflicts-updated">
                                        {conflictsValue.updated.map((conflict, idx) => (
                                            <EntityMergeRequestConflictListItem
                                                conflict={conflict}
                                                mergeRequest={mergeRequestValue}
                                                key={idx}
                                            />
                                        ))}
                                    </ListGroup>
                                </Accordion.Body>
                            </Accordion.Item>
                        )}
                        <Accordion.Item eventKey="1">
                            <Accordion.Header key="conflicts-accordion-header">
                                You can resolve the following conflicts
                            </Accordion.Header>
                            <Accordion.Body>
                                <ListGroup key="merge-requests-conflicts">
                                    {conflictsValue.resolvableConflicts.map(
                                        (conflict, idx) => (
                                            <EntityMergeRequestConflictListItem
                                                conflict={conflict}
                                                key={idx}
                                                mergeRequest={mergeRequestValue}
                                            />
                                        )
                                    )}
                                </ListGroup>
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="2">
                            <Accordion.Header key="conflicts-accordion-header">
                                You can not resolve the following conflicts
                            </Accordion.Header>
                            <Accordion.Body>
                                <ListGroup key="merge-requests-conflicts">
                                    {conflictsValue.unresolvableConflicts.map(
                                        (conflict, idx) => (
                                            <EntityMergeRequestConflictListItem
                                                conflict={conflict}
                                                key={idx}
                                                mergeRequest={mergeRequestValue}
                                            />
                                        )
                                    )}
                                </ListGroup>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                </Row>
            </Col>
        </Row>
    )
}

export function EntityMergeRequestConflictHeader({
    mergeRequest
}: {
    mergeRequest: EntityMergeRequest
}) {
    const dispatch: AppDispatch = useDispatch()
    return (
        <Row>
            <Col xs="auto">
                <OverlayTrigger
                    placement="right"
                    delay={{ show: 250, hide: 400 }}
                    overlay={
                        <Tooltip id="button-tooltip">
                            <span>This is the destination of the Entity Merge. </span>
                            <span>It determines the resulting display text. </span>
                            <span>I.e., </span>
                            <span className="fw-bold">
                                {mergeRequest.entityDestination.displayTxt}
                            </span>
                        </Tooltip>
                    }
                >
                    <Row>
                        <Col xs="auto">
                            <ArrowRightCircleFill />
                        </Col>
                        <Col className="ps-0">
                            <span className="fw-bold">
                                {mergeRequest.entityDestination.displayTxt}
                            </span>
                        </Col>
                    </Row>
                </OverlayTrigger>
                <Row>
                    <Col xs="auto">
                        <ArrowLeftCircle />
                    </Col>
                    <Col className="ps-0">
                        <span>{mergeRequest.entityOrigin.displayTxt}</span>
                    </Col>
                </Row>
            </Col>
            <Col />
            <Col xs="auto">
                <OverlayTrigger
                    placement="left"
                    delay={{ show: 250, hide: 400 }}
                    overlay={
                        <Tooltip id="button-tooltip">
                            Reverse origin and destination of the entity merge request.
                        </Tooltip>
                    }
                >
                    {/* Empty div to allow tooltip showing   */}
                    <span>
                        <Button
                            onClick={() => {
                                dispatch(
                                    reverseOriginDestination(mergeRequest.idPersistent)
                                ).then((mergeRequest) => {
                                    if (
                                        mergeRequest !== undefined &&
                                        mergeRequest !== null
                                    ) {
                                        dispatch(
                                            getEntityMergeRequestConflicts(
                                                mergeRequest.idPersistent
                                            )
                                        )
                                    }
                                })
                            }}
                        >
                            Reverse Direction
                        </Button>
                    </span>
                </OverlayTrigger>
            </Col>
        </Row>
    )
}

export function EntityMergeRequestConflictListItem({
    conflict,
    mergeRequest
}: {
    conflict: RemoteInterface<EntityMergeRequestConflict>
    mergeRequest: EntityMergeRequest
}) {
    const dispatch: AppDispatch = useDispatch()
    let fwKeep = 'fw-normal',
        fwReplace = 'fw-normal',
        bgKeep = '',
        bgReplace = ''
    if (conflict.value.replace == true) {
        fwReplace = 'fw-bold'
        bgReplace = 'bg-primary-subtle'
    } else if (conflict.value.replace == false) {
        fwKeep = 'fw-bold'
        bgKeep = 'bg-primary-subtle'
    }
    let destinationInstanceValue = conflict.value.tagInstanceDestination?.value,
        destinationStyle = 'fst-normal'
    if (destinationInstanceValue === undefined) {
        destinationStyle = 'fst-italic'
        destinationInstanceValue = ''
    }
    const destinationSpan = (
        <span className={destinationStyle}>{destinationInstanceValue}</span>
    )
    return (
        <ListGroup.Item className="mb-1">
            <Col>
                <Row key="tag-def-row">
                    <Col key="entity-description" xs="auto">
                        Tag Definition:
                    </Col>
                    <Col className="fw-bold text-start">
                        {constructColumnTitleSpans(
                            conflict.value.tagDefinition.namePath
                        )}
                    </Col>
                </Row>
                <Row key="tag-instance-row">
                    <Col>
                        <Row key="existing-row">
                            <Col xs="auto" key="button-column">
                                <ChoiceButton
                                    className="w-200px mb-1"
                                    label="Keep Existing Value"
                                    checked={conflict.value.replace == false}
                                    onClick={() =>
                                        dispatch(
                                            resolveEntityConflict({
                                                idMergeRequestPersistent:
                                                    mergeRequest.idPersistent,
                                                tagDefinition:
                                                    conflict.value.tagDefinition,
                                                tagInstanceOrigin:
                                                    conflict.value.tagInstanceOrigin,
                                                entityOrigin: mergeRequest.entityOrigin,
                                                tagInstanceDestination:
                                                    conflict.value
                                                        .tagInstanceDestination,
                                                entityDestination:
                                                    mergeRequest.entityDestination,
                                                replace: false
                                            })
                                        )
                                    }
                                />
                            </Col>
                            <Col
                                className={
                                    [fwKeep, bgKeep].join(' ') +
                                    ' border-start border-end border-top'
                                }
                            >
                                {destinationSpan}
                            </Col>
                        </Row>
                        <Row key="replace-row">
                            <Col xs="auto" key="button-column">
                                <ChoiceButton
                                    className="w-200px mt-1"
                                    label="Use new Value"
                                    checked={conflict.value.replace == true}
                                    onClick={() =>
                                        dispatch(
                                            resolveEntityConflict({
                                                idMergeRequestPersistent:
                                                    mergeRequest.idPersistent,
                                                tagDefinition:
                                                    conflict.value.tagDefinition,
                                                tagInstanceOrigin:
                                                    conflict.value.tagInstanceOrigin,
                                                entityOrigin: mergeRequest.entityOrigin,
                                                tagInstanceDestination:
                                                    conflict.value
                                                        .tagInstanceDestination,
                                                entityDestination:
                                                    mergeRequest.entityDestination,
                                                replace: true
                                            })
                                        )
                                    }
                                />
                            </Col>
                            <Col
                                className={[fwReplace, bgReplace].join(' ') + ' border'}
                                key="value-column"
                            >
                                {conflict.value.tagInstanceOrigin.value}
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Col>
        </ListGroup.Item>
    )
}
