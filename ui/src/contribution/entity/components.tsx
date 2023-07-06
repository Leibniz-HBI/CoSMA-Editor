import { useLoaderData } from 'react-router-dom'
import { PutDuplicateCallback, useContributionEntities } from './hooks'
import { ContributionStepper } from '../components'
import { RemoteTriggerButton, CosmaeLoading } from '../../util/components/misc'
import {
    Button,
    CloseButton,
    Col,
    Form,
    FormCheck,
    ListGroup,
    Overlay,
    Popover,
    ProgressBar,
    Row
} from 'react-bootstrap'
import { useLayoutEffect, useRef } from 'react'
import { EntityWithDuplicates } from './state'

export function EntitiesStep() {
    const idContributionPersistent = useLoaderData() as string
    const {
        getEntityDuplicatesCallback,
        contributionCandidate,
        isLoading,
        entities,
        minLoadingIdx,
        completeEntityAssignment,
        completeEntityAssignmentCallback,
        clearEntityAssignmentErrorCallback,
        isDuplicates,
        putDuplicateCallback
    } = useContributionEntities(idContributionPersistent)
    useLayoutEffect(() => {
        getEntityDuplicatesCallback()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idContributionPersistent])
    const buttonRef = useRef(null)
    const containerRef = useRef(null)
    if (contributionCandidate.value === undefined || isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ContributionStepper
            selectedIdx={2}
            id_persistent={idContributionPersistent}
            step={contributionCandidate.value.step}
        >
            <Col ref={containerRef} className="h-100 overflow-hidden">
                <Row>
                    <Col sm="auto" ref={buttonRef} key="entities-step-complete-button">
                        <RemoteTriggerButton
                            normalLabel="Merge Assigned Entities"
                            successLabel="Entities Successfully Merged"
                            remoteState={completeEntityAssignment}
                            onClick={completeEntityAssignmentCallback}
                        />
                        {
                            <Overlay
                                show={completeEntityAssignment?.errorMsg !== undefined}
                                target={buttonRef}
                                container={containerRef}
                                placement="bottom"
                            >
                                <Popover id="finalize-column-assignment-error-popover">
                                    <Popover.Header className="bg-danger text-light">
                                        <Row className="justify-content-between">
                                            <Col>Error</Col>
                                            <CloseButton
                                                variant="white"
                                                onClick={
                                                    clearEntityAssignmentErrorCallback
                                                }
                                            ></CloseButton>
                                        </Row>
                                    </Popover.Header>
                                    <Popover.Body>
                                        <span>
                                            {completeEntityAssignment?.errorMsg}
                                        </span>
                                    </Popover.Body>
                                </Popover>
                            </Overlay>
                        }
                    </Col>
                    <Col key="entities-step-hint">
                        Please check for duplicate values. Select the first Row to
                        indicate that there is no duplicate.
                    </Col>
                    <Col sm="auto" key="entities-step-add-tag-button">
                        <Button>Show Additional tag values</Button>
                    </Col>
                </Row>
                <Row className="mt-4">
                    <ProgressBar
                        striped
                        animated
                        hidden={minLoadingIdx === undefined}
                        variant="primary"
                        now={Math.round(
                            (100 * (minLoadingIdx ?? 100)) / entities.value.length
                        )}
                        label="Loading Duplicate Candidates"
                    />
                </Row>
                <Row className="h-100 ms-2 mt-3 overflow-y-scroll">
                    {isDuplicates ? (
                        <ListGroup>
                            {entities.value
                                .filter((entity) => !entity.similarEntities.isLoading)
                                .map((entity) => (
                                    <EntitySimilarityItem
                                        entity={entity}
                                        putDuplicateCallback={putDuplicateCallback}
                                    />
                                ))}
                        </ListGroup>
                    ) : (
                        <span>There are no duplicates</span>
                    )}
                </Row>
            </Col>
        </ContributionStepper>
    )
}

export function EntitySimilarityItem({
    entity,
    putDuplicateCallback
}: {
    entity: EntityWithDuplicates
    putDuplicateCallback: PutDuplicateCallback
}) {
    const { similarEntities, displayTxt, idPersistent } = entity
    if (similarEntities.errorMsg !== undefined) {
        return (
            <ListGroup.Item className="bg-danger">
                <span>{`Could not get duplicates for ${displayTxt}.\n`}</span>
                <span>{`Reason: ${similarEntities.errorMsg}`}</span>
            </ListGroup.Item>
        )
    }
    if (similarEntities.value.length == 0) {
        return <></>
    }
    return (
        <ListGroup.Item key={idPersistent}>
            <Form>
                <Col>
                    <Row className="fw-bold">{`Uploaded Entity with display txt ${displayTxt}`}</Row>
                    <Row>
                        <Form.Check
                            type="radio"
                            label="Create new entity"
                            value=""
                            checked={entity.assignedDuplicate.value === undefined}
                            onChange={(_) =>
                                putDuplicateCallback(entity.idPersistent, undefined)
                            }
                        />
                    </Row>
                    {similarEntities.value.map((candidate) => (
                        <Row>
                            <FormCheck
                                type="radio"
                                label={`Existing entity ${candidate.displayTxt} has similarity of ${candidate.similarity}.`}
                                value={candidate.idPersistent}
                                checked={
                                    candidate.idPersistent ==
                                    entity.assignedDuplicate.value?.idPersistent
                                }
                                onChange={(_) =>
                                    putDuplicateCallback(
                                        entity.idPersistent,
                                        candidate.idPersistent
                                    )
                                }
                            ></FormCheck>
                        </Row>
                    ))}
                </Col>
            </Form>
        </ListGroup.Item>
    )
}
