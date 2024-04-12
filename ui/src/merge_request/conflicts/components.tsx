import { useLoaderData } from 'react-router-dom'
import {
    ChoiceButton,
    RemoteTriggerButton,
    CosmaeLoading
} from '../../util/components/misc'
import {
    Accordion,
    Col,
    Form,
    ListGroup,
    OverlayTrigger,
    ProgressBar,
    Row,
    Tooltip
} from 'react-bootstrap'
import { MergeRequestConflict, TagInstance } from './state'
import { RemoteInterface } from '../../util/state'
import { useEffect } from 'react'
import { Entity } from '../../table/state'
import { TagDefinition } from '../../column_menu/state'
import { MergeRequest } from '../state'
import { MergeRequestListItemBody } from '../components'
import { useAppDispatch, useAppSelector } from '../../hooks'
import {
    getMergeRequestConflicts,
    resolveConflict,
    startMerge,
    toggleDisableOriginOnMerge
} from './thunks'
import {
    selectDisableOriginOnMerge,
    selectResolvedCount,
    selectStartMerge,
    selectTagMergeRequestConflictsByCategory
} from './selectors'
import { ArrowLeftCircle } from 'react-bootstrap-icons'
import { TabView } from '../../util/components/tabs'
import { CommentHistoryAndForm } from '../../comments/components'

export function MergeRequestConflictView() {
    const idMergeRequestPersistent = useLoaderData() as string
    return (
        <TabView
            tabList={[
                {
                    name: 'Discuss',
                    component: (
                        <CommentHistoryAndForm
                            idPersistent={idMergeRequestPersistent}
                        />
                    )
                },
                {
                    name: 'Resolve',
                    component: (
                        <MergeRequestConflictResolutionView
                            idMergeRequestPersistent={idMergeRequestPersistent}
                        />
                    )
                }
            ]}
        />
    )
}
export function MergeRequestConflictResolutionView({
    idMergeRequestPersistent
}: {
    idMergeRequestPersistent: string
}) {
    //eslint-disable-next-line react-hooks/exhaustive-deps
    const dispatch = useAppDispatch()
    const conflictsByCategory = useAppSelector(selectTagMergeRequestConflictsByCategory)
    const startMergeValue = useAppSelector(selectStartMerge)
    const [resolvedCount, conflictsCount] = useAppSelector(selectResolvedCount)
    const resolveConflictCallback = ({
        entity,
        tagInstanceOrigin,
        tagDefinitionOrigin,
        tagInstanceDestination,
        tagDefinitionDestination,
        replace
    }: {
        entity: Entity
        tagInstanceOrigin: TagInstance
        tagDefinitionOrigin: TagDefinition
        tagInstanceDestination?: TagInstance
        tagDefinitionDestination: TagDefinition
        replace: boolean
    }) => {
        dispatch(
            resolveConflict({
                idMergeRequestPersistent,
                entity,
                tagInstanceOrigin,
                tagDefinitionOrigin,
                tagInstanceDestination,
                tagDefinitionDestination,
                replace
            })
        )
    }
    useEffect(() => {
        if (conflictsByCategory.isLoading) {
            return
        }
        dispatch(getMergeRequestConflicts(idMergeRequestPersistent))
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idMergeRequestPersistent])

    const conflictsByCategoryValue = conflictsByCategory.value
    if (conflictsByCategory.isLoading || conflictsByCategoryValue === undefined) {
        return CosmaeLoading()
    }
    return (
        <Row className="h-100">
            <Col className="h-100 overflow-hidden d-flex flex-column ps-5 pe-5">
                <Row key="merge-button-row">
                    <Col xs="auto">
                        <RemoteTriggerButton
                            label="Apply Resolutions to Destination"
                            onClick={() =>
                                dispatch(startMerge(idMergeRequestPersistent))
                            }
                            isLoading={startMergeValue.value}
                        />
                    </Col>
                    <Col>
                        <MergeRequestListItemBody
                            mergeRequest={conflictsByCategoryValue.mergeRequest}
                        />
                    </Col>
                    <OverlayTrigger
                        overlay={
                            <Tooltip id="disable-origin-on-merge-tooltip">
                                <span>
                                    When this toggle is enabled, the origin tag
                                    definition, marked with
                                </span>
                                <span> </span>
                                <span>
                                    <ArrowLeftCircle />
                                </span>
                                <span> </span>
                                <span>
                                    will be disabled. I.e., the tag definition will not
                                    appear anymore in the the tag definition explorer
                                    but is still kept in the history.
                                </span>
                            </Tooltip>
                        }
                        placement="left"
                    >
                        <Col>
                            <DisableOriginOnMergeToggle
                                idMergeRequestPersistent={
                                    conflictsByCategoryValue.mergeRequest.idPersistent
                                }
                            />
                        </Col>
                    </OverlayTrigger>
                </Row>
                <Row>
                    <MergeRequestConflictProgressBar
                        resolvedCount={resolvedCount}
                        conflictsCount={conflictsCount}
                    />
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
                                                    mergeRequest={
                                                        conflictsByCategoryValue.mergeRequest
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
                        <Accordion.Item eventKey="1" data-testid="conflicts-accordion">
                            <Accordion.Header key="conflicts-accordion-header">
                                The Merge request has the following conflicts
                            </Accordion.Header>
                            <Accordion.Body>
                                <ListGroup key="merge-requests-conflicts">
                                    {conflictsByCategoryValue.conflicts.map(
                                        (conflict, idx) => (
                                            <MergeRequestConflictItem
                                                mergeRequest={
                                                    conflictsByCategoryValue.mergeRequest
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
    mergeRequest,
    resolveConflictCallback
}: {
    conflict: RemoteInterface<MergeRequestConflict>
    mergeRequest: MergeRequest
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
        tagDefinitionOrigin: TagDefinition
        tagInstanceDestination?: TagInstance
        tagDefinitionDestination: TagDefinition
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
        <ListGroup.Item className="mb-1" data-testid="conflict-item">
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
                                        tagDefinitionOrigin:
                                            mergeRequest.originTagDefinition,
                                        tagInstanceDestination:
                                            conflict.value.tagInstanceDestination,
                                        tagDefinitionDestination:
                                            mergeRequest.destinationTagDefinition,
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
                                label="Use New Value"
                                checked={conflict.value.replace == true}
                                onClick={() =>
                                    resolveConflictCallback({
                                        entity: conflict.value.entity,
                                        tagInstanceOrigin:
                                            conflict.value.tagInstanceOrigin,
                                        tagDefinitionOrigin:
                                            mergeRequest.originTagDefinition,
                                        tagInstanceDestination:
                                            conflict.value.tagInstanceDestination,
                                        tagDefinitionDestination:
                                            mergeRequest.destinationTagDefinition,
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

export function MergeRequestConflictProgressBar({
    resolvedCount,
    conflictsCount
}: {
    resolvedCount?: number
    conflictsCount?: number
}) {
    let variant = 'warning'
    let label = 'Merge Requests not yet loaded'
    let striped = true
    let now = 100
    if (conflictsCount !== undefined && resolvedCount !== undefined) {
        if (resolvedCount == conflictsCount) {
            striped = false
            variant = 'success'
            label = 'All conflicts resolved.'
        } else {
            variant = 'primary'
            label = `Resolved ${resolvedCount}/${conflictsCount} conflicts`
            now = Math.round(100 * (resolvedCount / conflictsCount))
        }
    }
    return <ProgressBar variant={variant} label={label} striped={striped} now={now} />
}

export function DisableOriginOnMergeToggle({
    idMergeRequestPersistent
}: {
    idMergeRequestPersistent: string
}) {
    const dispatch = useAppDispatch()
    const disableOriginOnMerge = useAppSelector(selectDisableOriginOnMerge)
    return (
        <Form.Check
            type="switch"
            label={
                <>
                    <span>Disable </span>
                    <span> </span>
                    <span>
                        <ArrowLeftCircle />
                    </span>
                    <span> </span>
                    <span>Tag on Merge</span>
                </>
            }
            checked={disableOriginOnMerge}
            onChange={(evt) => {
                evt.stopPropagation()
                dispatch(
                    toggleDisableOriginOnMerge(
                        idMergeRequestPersistent,
                        !disableOriginOnMerge
                    )
                )
            }}
        />
    )
}
