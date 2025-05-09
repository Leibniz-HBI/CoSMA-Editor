import { ChangeEvent, useState } from 'react'
import { Button, Col, FormCheck, Modal, Row } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { FormField } from '../../../util/form'
import { PutDuplicateCallback } from '../components'
import {
    selectLastMatchHit,
    selectShowColumnsMenu,
    selectEntities,
    selectSelectedEntity,
    selectShowJustificationInput
} from '../selectors'

import {
    clearHitLastMatch,
    closeJustificationInput,
    removeAdditionalColumnByIdPersistent,
    toggleColumnMenu
} from '../slice'
import { ModalBody } from 'react-bootstrap'
import { selectContributionJustification } from '../../selectors'
import { CompleteAssignmentButton } from './buttons'
import { ColumnMenuBody } from '../../../column_menu/components/menu'
import { getContributionValues } from '../thunks'
import { EntityWithDuplicates } from '../state'

export function JustificationModal({
    putDuplicateCallback
}: {
    putDuplicateCallback: PutDuplicateCallback
}) {
    const contributionJustification = useAppSelector(selectContributionJustification)
    const show = useAppSelector(selectShowJustificationInput)
    const selectedEntity = useAppSelector(selectSelectedEntity)
    const dispatch = useAppDispatch()
    const closeModalCallback = () => dispatch(closeJustificationInput())
    return (
        <Modal show={show} onHide={closeModalCallback}>
            <Modal.Header closeButton={true}>Add Justification</Modal.Header>
            <Modal.Body>
                {show && selectedEntity !== undefined && (
                    <JustificationModalBody
                        entity={selectedEntity}
                        contributionJustification={contributionJustification}
                        putDuplicateCallback={putDuplicateCallback}
                        closeModalCallback={closeModalCallback}
                    />
                )}
            </Modal.Body>
        </Modal>
    )
}

function JustificationModalBody({
    entity,
    contributionJustification,
    putDuplicateCallback,
    closeModalCallback
}: {
    entity: EntityWithDuplicates
    contributionJustification: string | undefined
    putDuplicateCallback: PutDuplicateCallback
    closeModalCallback: VoidFunction
}) {
    const entityJustification = entity.justificationTxt
    const [justification, setJustification] = useState(
        entityJustification ?? contributionJustification ?? ''
    )
    const [keepJustification, setKeepJustification] = useState(false)
    const button = (
        <Button
            onClick={() =>
                putDuplicateCallback({
                    idEntityOriginPersistent: entity.idPersistent,
                    idEntityDestinationPersistent:
                        entity.assignedDuplicate.value?.idPersistent,
                    justificationTxt: justification,
                    keepJustificationForAll: keepJustification,
                    onSuccess: closeModalCallback
                })
            }
        >
            Submit
        </Button>
    )
    return (
        <Col className="ms-2">
            <Row className="ms-0 mb-2">
                Please add a justification for adding the entity.
            </Row>
            <Row>
                <FormField
                    value={justification}
                    as="textarea"
                    name="justification"
                    label="Justification"
                    handleChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setJustification(e.target.value)
                    }
                    className="min-h-200px ps-4"
                />
            </Row>
            <Row className="justify-content-end align-items-center">
                <Col xs="auto">
                    <FormCheck
                        label="Use justification for all entities"
                        checked={keepJustification}
                        onChange={(_e: ChangeEvent<HTMLInputElement>) =>
                            setKeepJustification(!keepJustification)
                        }
                    />
                </Col>
                <Col xs="auto">{button}</Col>
            </Row>
        </Col>
    )
}

export function LastMatchModal({
    idContributionPersistent
}: {
    idContributionPersistent: string
}) {
    const lastMatchHit = useAppSelector(selectLastMatchHit)
    const dispatch = useAppDispatch()
    return (
        <Modal show={lastMatchHit}>
            <ModalBody>
                <Row className="justify-content-center mb-5 mt-3">
                    <Col xs="auto">You processed the last entity</Col>
                </Row>
                <Row className="justify-content-end">
                    <Col xs="auto">
                        <Button
                            variant="outline-primary"
                            onClick={() => dispatch(clearHitLastMatch())}
                        >
                            Review Matches
                        </Button>
                    </Col>
                    <Col xs="auto">
                        <CompleteAssignmentButton
                            idContributionPersistent={idContributionPersistent}
                        />
                    </Col>
                </Row>
            </ModalBody>
        </Modal>
    )
}

export function AddColumnsModal({
    idContributionPersistent,
    columnIndices
}: {
    idContributionPersistent: string
    columnIndices: { [key: string]: number }
}) {
    const dispatch = useAppDispatch()
    const showColumnsMenu = useAppSelector(selectShowColumnsMenu)
    const entities = useAppSelector(selectEntities)
    return (
        <Modal
            show={showColumnsMenu}
            onHide={() => dispatch(toggleColumnMenu())}
            data-testid="create-column-modal"
            key="entities-step-modal"
        >
            <Modal.Header closeButton>
                <Modal.Title>Create a new column</Modal.Title>
            </Modal.Header>
            <Modal.Body className="vh-85 bg-secondary">
                <ColumnMenuBody
                    hideColumnDataCallback={(column) => {
                        dispatch(removeAdditionalColumnByIdPersistent(column.idPersistent))
                    }}
                    loadColumnDataCallback={(column) => {
                        const chunkSize = 50
                        for (
                            let startIdx = 0;
                            startIdx < entities.value.length;
                            startIdx += chunkSize
                        ) {
                            if (entities.isLoading) {
                                return
                            }
                            const endIdx = Math.min(
                                entities.value.length,
                                startIdx + chunkSize
                            )
                            const entitiesSlice = entities.value.slice(startIdx, endIdx)
                            const entitiesMap: { [key: string]: string[] } = {}
                            for (const entity of entitiesSlice) {
                                if (entity.similarEntities.isLoading) {
                                    return
                                }
                                entitiesMap[entity.idPersistent] = [
                                    entity.idPersistent,
                                    ...new Set(
                                        entity.similarEntities.value.map(
                                            (entity) => entity.idPersistent
                                        )
                                    )
                                ]
                            }
                            dispatch(
                                getContributionValues({
                                    entitiesGroupMap: entitiesMap,
                                    columnList: [column],
                                    idContributionPersistent: idContributionPersistent
                                })
                            )
                        }
                    }}
                    columnIndices={columnIndices}
                />
            </Modal.Body>
        </Modal>
    )
}
