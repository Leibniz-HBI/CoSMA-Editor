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
import { EntityMergeRequestConflict, Column } from './state'
import { EntityMergeRequest } from '../state'
import { RemoteInterface } from '../../../util/state'
import { ColumnNamePath } from '../../../column_menu/components/misc'
import { ChoiceButton, RemoteTriggerButton } from '../../../util/components/misc'
import { ChangeEvent, useEffect, useMemo } from 'react'
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
import { ColumnType } from '../../../column_menu/state'
import { ResolutionFormArgs } from '../../conflicts/components'
import { ReplacementState, Value } from '../../conflicts/state'
import { Entity } from '../../../entity/state'
import { Formik } from 'formik'
import { debounce } from 'debounce'
import { FormField } from '../../../util/form'

export function EntityMergeRequestConflictView() {
    const idMergeRequestPersistent = useLoaderData() as string
    const dispatch: AppDispatch = useDispatch()
    useEffect(() => {
        dispatch(getEntityMergeRequest(idMergeRequestPersistent))
    }, [idMergeRequestPersistent])
    return (
        <EntityMergeRequestConflictComponent
            loadDataCallback={() => {
                //do nothing
            }}
        />
    )
}

type ResolveEntityConflictArg = {
    column: Column
    valueOrigin: Value
    entityOrigin: Entity
    valueDestination?: Value
    entityDestination: Entity
    replacementState?: ReplacementState
    replacementValue: string | undefined
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
    const resolveConflictCallback = ({
        column,
        valueOrigin,
        entityOrigin,
        valueDestination,
        entityDestination,
        replacementState,
        replacementValue
    }: ResolveEntityConflictArg) => {
        dispatch(
            resolveEntityConflict({
                idMergeRequestPersistent: mergeRequestValue.idPersistent,
                column,
                valueOrigin,
                entityOrigin,
                valueDestination,
                entityDestination,
                replacementState,
                replacementValue
            })
        )
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
                                                resolveConflictCallback={
                                                    resolveConflictCallback
                                                }
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
                                                resolveConflictCallback={
                                                    resolveConflictCallback
                                                }
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
                                                resolveConflictCallback={
                                                    resolveConflictCallback
                                                }
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

function mkDebouncedResolveCallback() {
    return debounce(
        (
            args: ResolveEntityConflictArg,
            callback: (args: ResolveEntityConflictArg) => void
        ) => callback(args),
        400
    )
}

export function EntityMergeRequestConflictListItem({
    conflict,
    mergeRequest,
    resolveConflictCallback
}: {
    conflict: RemoteInterface<EntityMergeRequestConflict>
    mergeRequest: EntityMergeRequest
    resolveConflictCallback: (args: ResolveEntityConflictArg) => void
}) {
    const debouncedCallback = useMemo(mkDebouncedResolveCallback, [
        conflict.value.valueOrigin.idPersistent,
        conflict.value.valueDestination?.idPersistent
    ])
    return (
        <ListGroup.Item className="mb-1">
            <Col key="column-column">
                <Row key="column-def-row">
                    <Col key="column-description" xs="auto">
                        Column:
                    </Col>
                    <Col className="fw-bold text-start" key="column-name-path">
                        <ColumnNamePath
                            column={{
                                ...conflict.value.column,
                                columnType: ColumnType.String,
                                hidden: false,
                                disabled: false
                            }}
                        />
                    </Col>
                </Row>
                <Formik
                    initialValues={{
                        replacementState: conflict.value.replacementState,
                        replacementValue: conflict.value.replacementValue
                    }}
                    onSubmit={(formValues) => {
                        debouncedCallback(
                            {
                                column: conflict.value.column,
                                valueOrigin: conflict.value.valueOrigin,
                                entityOrigin: mergeRequest.entityOrigin,
                                valueDestination: conflict.value.valueDestination,
                                entityDestination: mergeRequest.entityDestination,
                                replacementValue: formValues.replacementValue,
                                replacementState: formValues.replacementState
                            },
                            resolveConflictCallback
                        )
                    }}
                >
                    {({ setValues, values, submitForm }) => (
                        <ResolutionFormBody
                            values={values}
                            setValues={setValues}
                            submitForm={submitForm}
                            keepValue={conflict.value?.valueDestination?.value}
                            replaceValue={conflict.value?.valueOrigin?.value}
                        />
                    )}
                </Formik>
            </Col>
        </ListGroup.Item>
    )
}

function ResolutionFormBody({
    values,
    setValues,
    submitForm,
    keepValue,
    replaceValue
}: {
    values: ResolutionFormArgs
    setValues: (values: ResolutionFormArgs) => void
    submitForm: () => void
    keepValue?: string
    replaceValue?: string
}) {
    let fwKeep = 'fw-normal',
        fwReplace = 'fw-normal',
        fwReplacementValue = 'fw-normal',
        bgKeep = '',
        bgReplace = '',
        bgReplacementValue = ''
    if (values.replacementState === ReplacementState.REPLACE) {
        fwReplace = 'fw-bold'
        bgReplace = 'bg-primary-subtle'
    } else if (values.replacementState === ReplacementState.VALUE) {
        fwReplacementValue = 'fw-bold'
        bgReplacementValue = 'bg-primary-subtle'
    } else if (values.replacementState === ReplacementState.KEEP) {
        fwKeep = 'fw-bold'
        bgKeep = 'bg-primary-subtle'
    }
    let keepStyle = 'fst-normal'
    let keepValueDisplay = keepValue
    if (keepValue === undefined) {
        keepStyle = 'fst-italic'
        keepValueDisplay = ''
    }
    const keepValueSpan = <span className={keepStyle}>{keepValueDisplay}</span>
    return (
        <Row key="column-instance-row">
            <Col>
                <Row key="existing-row">
                    <Col xs="auto" key="button-column">
                        <ChoiceButton
                            className="w-200px mb-1"
                            label="Keep Existing Value"
                            checked={values.replacementState === ReplacementState.KEEP}
                            onClick={() => {
                                setValues({
                                    ...values,
                                    replacementState: ReplacementState.KEEP
                                })
                                submitForm()
                            }}
                        />
                    </Col>
                    <Col
                        className={
                            [fwKeep, bgKeep].join(' ') +
                            ' border-start border-end border-top'
                        }
                    >
                        {keepValueSpan}
                    </Col>
                </Row>
                <Row key="replace-row">
                    <Col xs="auto" key="button-column">
                        <ChoiceButton
                            className="w-200px mt-1"
                            label="Use new Value"
                            checked={
                                values.replacementState === ReplacementState.REPLACE
                            }
                            onClick={() =>
                                setValues({
                                    ...values,
                                    replacementState: ReplacementState.REPLACE
                                })
                            }
                        />
                    </Col>
                    <Col
                        className={[fwReplace, bgReplace].join(' ') + ' border'}
                        key="value-column"
                    >
                        {replaceValue ?? ''}
                    </Col>
                </Row>
                <Row key="replacement-value-row" className="pt-1">
                    <Col xs="auto" key="button-column" className="mt-1">
                        <ChoiceButton
                            className="w-200px mt-1"
                            label="Use Replacement Value"
                            checked={values.replacementState === ReplacementState.VALUE}
                            onClick={() => {
                                setValues({
                                    ...values,
                                    replacementState: ReplacementState.VALUE,
                                    replacementValue: values.replacementValue ?? ''
                                })
                                submitForm()
                            }}
                        />
                    </Col>
                    <Col className={[fwReplacementValue].join(' ')} key="value-column">
                        <FormField
                            value={values.replacementValue ?? ''}
                            label="Replacement Value"
                            name="replacement-value"
                            className={bgReplacementValue}
                            handleChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setValues({
                                    ...values,
                                    replacementValue: e.target.value
                                })
                                submitForm()
                            }}
                        />
                    </Col>
                </Row>
            </Col>
        </Row>
    )
}
