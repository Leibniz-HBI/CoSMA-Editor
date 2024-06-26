import { Button, Col } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch } from '../../../store'
import { RemoteTriggerButton } from '../../../util/components/misc'
import { loadContributionDetails } from '../../thunks'
import { selectCompleteEntityAssignment, selectSelectedEntity } from '../selectors'
import { completeEntityAssignment } from '../thunks'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { openJustificationInput } from '../slice'

export function CompleteAssignmentButton({
    idContributionPersistent
}: {
    idContributionPersistent: string
}) {
    const completeEntityAssignmentState = useSelector(selectCompleteEntityAssignment)
    const dispatch: AppDispatch = useDispatch()
    const navigate = useNavigate()
    return (
        <>
            <Col sm="auto" key="entities-step-complete-button">
                <RemoteTriggerButton
                    label="Confirm Assigned Duplicates"
                    isLoading={completeEntityAssignmentState.isLoading}
                    onClick={() =>
                        dispatch(
                            completeEntityAssignment(idContributionPersistent)
                        ).then((success) => {
                            if (success) {
                                dispatch(
                                    loadContributionDetails(idContributionPersistent)
                                )
                                navigate(
                                    `/contribute/${idContributionPersistent}/complete`
                                )
                            }
                        })
                    }
                />
            </Col>
        </>
    )
}

export function ChangeJustificationButton() {
    const selectedEntity = useAppSelector(selectSelectedEntity)
    const dispatch = useAppDispatch()
    if (selectedEntity === undefined) {
        return <></>
    }
    return (
        <Button
            onClick={() =>
                dispatch(openJustificationInput(selectedEntity.idPersistent))
            }
        >
            Edit Justification
        </Button>
    )
}
