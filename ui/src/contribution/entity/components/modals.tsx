import { ChangeEvent, useState } from 'react'
import { Button, Col, FormCheck, Modal, Row } from 'react-bootstrap'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { FormField } from '../../../util/form'
import { PutDuplicateCallback } from '../components'
import {
    selectLastMatchHit,
    selectJustificationForEntityId,
    selectShowTagDefinitionsMenu,
    selectEntities
} from '../selectors'

import {
    clearHitLastMatch,
    closeJustificationInput,
    removeAdditionalTagByIdPersistent,
    toggleTagDefinitionMenu
} from '../slice'
import { ModalBody } from 'react-bootstrap'
import { selectContributionJustification } from '../../selectors'
import { CompleteAssignmentButton } from './buttons'
import { ColumnMenuBody } from '../../../column_menu/components/menu'
import { getContributionTagInstances } from '../thunks'

export function JustificationModal({
    putDuplicateCallback
}: {
    putDuplicateCallback: PutDuplicateCallback
}) {
    const contributionJustification = useAppSelector(selectContributionJustification)
    const justificationForId = useAppSelector(selectJustificationForEntityId)
    const [justification, setJustification] = useState('')
    const [keepJustification, setKeepJustification] = useState(
        contributionJustification !== undefined
    )
    const dispatch = useAppDispatch()
    const show = justificationForId !== undefined
    const closeModalCallback = () => dispatch(closeJustificationInput())
    let button = <></>
    if (show) {
        button = (
            <Button
                onClick={() =>
                    putDuplicateCallback({
                        idEntityOriginPersistent: justificationForId,
                        idEntityDestinationPersistent: undefined,
                        justificationTxt: justification,
                        keepJustificationForAll: keepJustification,
                        onSuccess: closeModalCallback
                    })
                }
            >
                Submit
            </Button>
        )
    }
    return (
        <Modal show={show} onHide={closeModalCallback}>
            <Modal.Header closeButton={true}>Add Justification</Modal.Header>
            <Modal.Body>
                {show && (
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
                )}
            </Modal.Body>
        </Modal>
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

export function AddTagDefinitionsModal({
    idContributionPersistent,
    tagDefinitionIndices
}: {
    idContributionPersistent: string
    tagDefinitionIndices: { [key: string]: number }
}) {
    const dispatch = useAppDispatch()
    const showTagDefinitionsMenu = useAppSelector(selectShowTagDefinitionsMenu)
    const entities = useAppSelector(selectEntities)
    return (
        <Modal
            show={showTagDefinitionsMenu}
            onHide={() => dispatch(toggleTagDefinitionMenu())}
            data-testid="create-column-modal"
            key="entities-step-modal"
        >
            <Modal.Header closeButton>
                <Modal.Title>Create a new tag</Modal.Title>
            </Modal.Header>
            <Modal.Body className="vh-85 bg-secondary">
                <ColumnMenuBody
                    hideColumnDataCallback={(tagDef) => {
                        dispatch(removeAdditionalTagByIdPersistent(tagDef.idPersistent))
                    }}
                    loadColumnDataCallback={(tagDef) => {
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
                                getContributionTagInstances({
                                    entitiesGroupMap: entitiesMap,
                                    tagDefinitionList: [tagDef],
                                    idContributionPersistent: idContributionPersistent
                                })
                            )
                        }
                    }}
                    columnIndices={tagDefinitionIndices}
                />
            </Modal.Body>
        </Modal>
    )
}
