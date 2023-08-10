import { useLoaderData } from 'react-router-dom'
import { useMergeRequestConflictResolutions } from './hooks'
import {
    ChoiceButton,
    RemoteTriggerButton,
    CosmaeLoading
} from '../../util/components/misc'
import {
    Accordion,
    CloseButton,
    Col,
    ListGroup,
    Overlay,
    Popover,
    Row
} from 'react-bootstrap'
import { MergeRequestConflict, TagInstance } from './state'
import { Remote } from '../../util/state'
import { useLayoutEffect, useRef } from 'react'
import { Entity } from '../../contribution/entity/state'
import { ColumnDefinition } from '../../column_menu/state'

export function MergeRequestConflictResolutionView() {
    const idMergeRequestPersistent = useLoaderData() as string
    const {
        conflictsByCategory,
        getMergeRequestConflictsCallback,
        resolveConflictCallback,
        startMerge,
        startMergeCallback,
        startMergeClearErrorCallback
    } = useMergeRequestConflictResolutions(idMergeRequestPersistent)
    //eslint-disable-next-line react-hooks/exhaustive-deps
    useLayoutEffect(getMergeRequestConflictsCallback, [idMergeRequestPersistent])
    const containerRef = useRef(null)
    const buttonRef = useRef(null)
    const conflictsByCategoryValue = conflictsByCategory.value
    if (conflictsByCategory.isLoading || conflictsByCategoryValue === undefined) {
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
                            normalLabel="Merge"
                            successLabel="Merge started successfully"
                            onClick={startMergeCallback}
                            remoteState={startMerge}
                        />
                        <Overlay
                            show={startMerge.errorMsg !== undefined}
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
                                            onClick={startMergeClearErrorCallback}
                                        ></CloseButton>
                                    </Row>
                                </Popover.Header>
                                <Popover.Body>
                                    <span>{startMerge.errorMsg}</span>
                                </Popover.Body>
                            </Popover>
                        </Overlay>
                    </Col>
                </Row>
                <Row
                    className="mt-2 h-100 overflow-y-scroll flex-basis-0 flex-grow-1"
                    key="conflicts-row"
                >
                    <Accordion defaultActiveKey={['0', '1']} alwaysOpen={true}>
                        {conflictsByCategoryValue.updated.length > 0 && (
                            <Accordion.Item eventKey="0">
                                <Accordion.Header>
                                    For the following conflicts the underlying data has
                                    changed
                                </Accordion.Header>
                                <Accordion.Body>
                                    <ListGroup key="merge-request-conflicts-updated">
                                        {conflictsByCategoryValue.updated.map(
                                            (conflict, idx) => (
                                                <MergeRequestConflictItem
                                                    tagDefinitionOrigin={
                                                        conflictsByCategoryValue.tagDefinitionOrigin
                                                    }
                                                    tagDefinitionDestination={
                                                        conflictsByCategoryValue.tagDefinitionDestination
                                                    }
                                                    conflict={conflict}
                                                    resolveConflictCallback={
                                                        resolveConflictCallback
                                                    }
                                                    key={`updated-${idx}`}
                                                />
                                            )
                                        )}
                                    </ListGroup>
                                </Accordion.Body>
                            </Accordion.Item>
                        )}
                        <Accordion.Item eventKey="1">
                            <Accordion.Header key="conflicts-accordion-header">
                                The Merge request has the following conflicts
                            </Accordion.Header>
                            <Accordion.Body>
                                <ListGroup key="merge-requests-conflicts">
                                    {conflictsByCategoryValue.conflicts.map(
                                        (conflict, idx) => (
                                            <MergeRequestConflictItem
                                                tagDefinitionOrigin={
                                                    conflictsByCategoryValue.tagDefinitionOrigin
                                                }
                                                tagDefinitionDestination={
                                                    conflictsByCategoryValue.tagDefinitionDestination
                                                }
                                                conflict={conflict}
                                                resolveConflictCallback={
                                                    resolveConflictCallback
                                                }
                                                key={`conflict-${idx}`}
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

export function MergeRequestConflictItem({
    conflict,
    tagDefinitionOrigin,
    tagDefinitionDestination,
    resolveConflictCallback
}: {
    conflict: Remote<MergeRequestConflict>
    tagDefinitionOrigin: ColumnDefinition
    tagDefinitionDestination: ColumnDefinition
    resolveConflictCallback: ({
        entity,
        tagInstanceOrigin,
        tagDefinitionOrigin,
        tagInstanceDestination,
        tagDefinitionDestination,
        replace
    }: {
        entity: Entity
        tagInstanceOrigin: TagInstance
        tagDefinitionOrigin: ColumnDefinition
        tagInstanceDestination?: TagInstance
        tagDefinitionDestination: ColumnDefinition
        replace: boolean
    }) => void
}) {
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
            <Row>
                <Col sm={2} key="entity-column">
                    <Row key="entity-description">Entity with display txt:</Row>
                    <Row className="fw-bold">{conflict.value.entity.displayTxt}</Row>
                </Col>
                <Col key="tag-instance-column">
                    <Row key="existing-row">
                        <Col xs="auto" key="button-column">
                            <ChoiceButton
                                className="w-200px mb-1"
                                label="Keep Existing Value"
                                checked={conflict.value.replace == false}
                                onClick={() =>
                                    resolveConflictCallback({
                                        entity: conflict.value.entity,
                                        tagInstanceOrigin:
                                            conflict.value.tagInstanceOrigin,
                                        tagDefinitionOrigin: tagDefinitionOrigin,
                                        tagInstanceDestination:
                                            conflict.value.tagInstanceDestination,
                                        tagDefinitionDestination:
                                            tagDefinitionDestination,
                                        replace: false
                                    })
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
                                    resolveConflictCallback({
                                        entity: conflict.value.entity,
                                        tagInstanceOrigin:
                                            conflict.value.tagInstanceOrigin,
                                        tagDefinitionOrigin: tagDefinitionOrigin,
                                        tagInstanceDestination:
                                            conflict.value.tagInstanceDestination,
                                        tagDefinitionDestination:
                                            tagDefinitionDestination,
                                        replace: true
                                    })
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
        </ListGroup.Item>
    )
}
