import { useDispatch, useSelector } from 'react-redux'
import {
    selectEntityMergeRequest,
    selectEntityMergeRequestConflicts
} from './selectors'
import {
    Accordion,
    CloseButton,
    Col,
    ListGroup,
    Overlay,
    Popover,
    Row
} from 'react-bootstrap'
import { EntityMergeRequestConflict } from './state'
import { EntityMergeRequest } from '../state'
import { RemoteInterface, newRemote } from '../../../util/state'
import { constructColumnTitleSpans } from '../../../column_menu/components/selection'
import {
    ChoiceButton,
    RemoteTriggerButton,
    CosmaeLoading
} from '../../../util/components/misc'
import { useEffect, useRef } from 'react'
import { AppDispatch } from '../../../store'
import { addError, newErrorState } from '../../../util/error/slice'
import { MergeRequestConflictProgressBar } from '../../conflicts/components'
import { ArrowLeftCircle, ArrowRightCircleFill } from 'react-bootstrap-icons'
import {
    resolveEntityConflict,
    getEntityMergeRequestConflicts,
    getEntityMergeRequest
} from './thunks'
import { useLoaderData } from 'react-router-dom'

export function EntityMergeRequestConflictView() {
    const idMergeRequestPersistent = useLoaderData() as string
    const dispatch: AppDispatch = useDispatch()
    useEffect(
        () => {
            dispatch(getEntityMergeRequest(idMergeRequestPersistent))
        }, // eslint-disable-next-line react-hooks/exhaustive-deps
        [idMergeRequestPersistent]
    )
    return <EntityMergeRequestConflictComponent />
}

export function EntityMergeRequestConflictComponent() {
    const dispatch: AppDispatch = useDispatch()
    const mergeRequest = useSelector(selectEntityMergeRequest)
    const conflicts = useSelector(selectEntityMergeRequestConflicts)
    useEffect(() => {
        if (mergeRequest.value !== undefined) {
            dispatch(getEntityMergeRequestConflicts(mergeRequest.value?.idPersistent))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mergeRequest.value?.idPersistent])
    const containerRef = useRef(null)
    const buttonRef = useRef(null)
    const conflictsValue = conflicts.value
    const mergeRequestValue = mergeRequest.value
    if (
        conflicts.isLoading ||
        conflictsValue === undefined ||
        mergeRequest.isLoading ||
        mergeRequestValue === undefined
    ) {
        return CosmaeLoading()
    }
    return (
        <Row className="h-100">
            <Col
                className="h-100 overflow-hidden d-flex flex-column ps-5 pe-5"
                ref={containerRef}
            >
                <Row key="merge-button-row">
                    <Col xs="auto" ref={buttonRef}>
                        <RemoteTriggerButton
                            normalLabel="Apply Resolutions to Destination"
                            successLabel="Application of Resolutions started."
                            onClick={() =>
                                dispatch(
                                    addError(
                                        newErrorState(
                                            'Entity merging not yet implemented'
                                        )
                                    )
                                )
                            }
                            remoteState={newRemote(false)}
                        />
                        <Overlay
                            show={false}
                            target={buttonRef}
                            container={containerRef}
                            placement="bottom"
                            key="merge-button-overlay"
                        >
                            <Popover id="start-merge-error-popover">
                                <Popover.Header className="bg-danger text-light">
                                    <Row className="justify-content-between">
                                        <Col>Error</Col>
                                        <CloseButton
                                            variant="white"
                                            onClick={() =>
                                                dispatch(
                                                    addError(
                                                        newErrorState(
                                                            'You should never see this'
                                                        )
                                                    )
                                                )
                                            }
                                        ></CloseButton>
                                    </Row>
                                </Popover.Header>
                                <Popover.Body>
                                    <span>'You should never see this'</span>
                                </Popover.Body>
                            </Popover>
                        </Overlay>
                    </Col>
                    <Col>
                        <EntityMergeRequestConflictHeader
                            mergeRequest={mergeRequestValue}
                        />
                    </Col>
                </Row>
                <Row>
                    <MergeRequestConflictProgressBar
                        resolvedCount={2}
                        conflictsCount={20}
                    />
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
    return (
        <Row>
            <Col>
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
                <Row>
                    <Col xs="auto">
                        <ArrowLeftCircle />
                    </Col>
                    <Col className="ps-0">
                        <span>{mergeRequest.entityOrigin.displayTxt}</span>
                    </Col>
                </Row>
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
