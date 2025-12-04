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
import { MergeRequestConflict, ReplacementState, Value } from './state'
import { RemoteInterface } from '../../util/state'
import { ChangeEvent, useEffect, useMemo } from 'react'
import { Entity } from '../../entity/state'
import { Column } from '../../column_menu/state'
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
    selectColumnMergeRequestConflictsByCategory
} from './selectors'
import { ArrowLeftCircle } from 'react-bootstrap-icons'
import { TabView } from '../../util/components/tabs'
import { CommentHistoryAndForm } from '../../comments/components'
import { Formik } from 'formik'
import { debounce } from 'debounce'
import { FormField } from '../../util/form'
import { clearMergeRequestConflict } from './slice'

export function MergeRequestConflictView() {
    const idMergeRequestPersistent = useLoaderData() as string
    const dispatch = useAppDispatch()
    useEffect(() => {
        return () => {
            dispatch(clearMergeRequestConflict())
        }
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return (
        <div className="d-contents">
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
        </div>
    )
}
type ResolveConflictArg = {
    entity: Entity
    valueOrigin: Value
    columnOrigin: Column
    valueDestination?: Value
    columnDestination: Column
    replacementState?: ReplacementState
    replacementValue: string | undefined
}
export function MergeRequestConflictResolutionView({
    idMergeRequestPersistent
}: {
    idMergeRequestPersistent: string
}) {
    const dispatch = useAppDispatch()
    const conflictsByCategory = useAppSelector(
        selectColumnMergeRequestConflictsByCategory
    )
    const startMergeValue = useAppSelector(selectStartMerge)
    const [resolvedCount, conflictsCount] = useAppSelector(selectResolvedCount)
    const resolveConflictCallback = ({
        entity,
        valueOrigin,
        columnOrigin,
        valueDestination,
        columnDestination,
        replacementState,
        replacementValue
    }: ResolveConflictArg) => {
        dispatch(
            resolveConflict({
                idMergeRequestPersistent,
                entity,
                valueOrigin,
                columnOrigin,
                valueDestination,
                columnDestination,
                replacementState,
                replacementValue
            })
        )
    }
    useEffect(() => {
        if (conflictsByCategory.isLoading) {
            return
        }
        dispatch(getMergeRequestConflicts(idMergeRequestPersistent))
    }, [idMergeRequestPersistent])

    const conflictsByCategoryValue = conflictsByCategory.value
    if (conflictsByCategory.isLoading || conflictsByCategoryValue === undefined) {
        return CosmaeLoading()
    }
    return (
        <Col className="overflow-hidden d-contents">
            <Row key="merge-button-row" className="ms-2 me-2 flex-grow-0 flex-shrink-1">
                <Col xs="auto">
                    <RemoteTriggerButton
                        label="Apply Resolutions to Destination"
                        onClick={() => dispatch(startMerge(idMergeRequestPersistent))}
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
                                When this toggle is enabled, the origin column, marked
                                with
                            </span>
                            <span> </span>
                            <span>
                                <ArrowLeftCircle />
                            </span>
                            <span> </span>
                            <span>
                                will be disabled. I.e., the column will not appear
                                anymore in the the column explorer but is still kept in
                                the history.
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
            <Row className="ms-2 me-2 flex-grow-0 flex-shrink-0">
                <MergeRequestConflictProgressBar
                    resolvedCount={resolvedCount}
                    conflictsCount={conflictsCount}
                />
            </Row>
            <Row
                className="ms-4 me-4 mt-2 overflow-y-auto flex-shrink-1 flex-grow-1 scroll-gutter"
                key="conflicts-row"
            >
                <Col xs={0} md={2} />
                <Col>
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
                                            (conflict) => (
                                                <MergeRequestConflictItem
                                                    mergeRequest={
                                                        conflictsByCategoryValue.mergeRequest
                                                    }
                                                    conflict={conflict}
                                                    resolveConflictCallback={
                                                        resolveConflictCallback
                                                    }
                                                    key={
                                                        conflict.value.valueOrigin
                                                            .idPersistent
                                                    }
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
                                        (conflict) => (
                                            <MergeRequestConflictItem
                                                mergeRequest={
                                                    conflictsByCategoryValue.mergeRequest
                                                }
                                                conflict={conflict}
                                                resolveConflictCallback={
                                                    resolveConflictCallback
                                                }
                                                key={conflict.value.valueOrigin.idPersistent}
                                            />
                                        )
                                    )}
                                </ListGroup>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                </Col>
                <Col xs={0} md={2} />
            </Row>
        </Col>
    )
}

export type ResolutionFormArgs = {
    replacementValue: string | undefined
    replacementState: ReplacementState | undefined
}

function mkDebouncedResolveCallback() {
    return debounce(
        (args: ResolveConflictArg, callback: (args: ResolveConflictArg) => void) =>
            callback(args),
        400
    )
}

export function MergeRequestConflictItem({
    conflict,
    mergeRequest,
    resolveConflictCallback
}: {
    conflict: RemoteInterface<MergeRequestConflict>
    mergeRequest: MergeRequest
    resolveConflictCallback: (args: ResolveConflictArg) => void
}) {
    const debouncedCallback = useMemo(mkDebouncedResolveCallback, [
        conflict.value.valueOrigin.idPersistent,
        conflict.value.valueDestination?.idPersistent
    ])
    return (
        <ListGroup.Item className="mb-1" data-testid="conflict-item">
            <Row>
                <Col sm={2} key="entity-column">
                    <Row key="entity-description">Entity with display txt:</Row>
                    <Row className="fw-bold">{conflict.value.entity.displayTxt}</Row>
                </Col>
                <Formik
                    initialValues={{
                        replacementState: conflict.value.replacementState,
                        replacementValue: conflict.value.replacementValue
                    }}
                    onSubmit={(formValues) => {
                        debouncedCallback(
                            {
                                entity: conflict.value.entity,
                                valueOrigin: conflict.value.valueOrigin,
                                columnOrigin: mergeRequest.originColumn,
                                valueDestination: conflict.value.valueDestination,
                                columnDestination: mergeRequest.destinationColumn,
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
            </Row>
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
        <Col key="value-column">
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
                        ' ms-3 me-3 border-start border-end border-top'
                    }
                >
                    {keepValueSpan}
                </Col>
            </Row>
            <Row key="replace-row">
                <Col xs="auto" key="button-column">
                    <ChoiceButton
                        className="w-200px mt-1"
                        label="Use New Value"
                        checked={values.replacementState === ReplacementState.REPLACE}
                        onClick={() => {
                            setValues({
                                ...values,
                                replacementState: ReplacementState.REPLACE
                            })

                            submitForm()
                        }}
                    />
                </Col>
                <Col
                    className={[fwReplace, bgReplace].join(' ') + ' ms-3 me-3 border'}
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
                    <span>Column on Merge</span>
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
