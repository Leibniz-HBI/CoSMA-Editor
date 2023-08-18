import { useLoaderData, useNavigate } from 'react-router-dom'
import { ContributionStepper } from '../components'
import { ContributionStep } from '../state'
import { Button, Row } from 'react-bootstrap'

export function CompleteStep() {
    const idContributionPersistent = useLoaderData() as string
    const navigate = useNavigate()
    return (
        <ContributionStepper
            selectedIdx={3}
            id_persistent={idContributionPersistent}
            step={ContributionStep.EntitiesAssigned}
        >
            <>
                <Row>
                    All entities were assigned. Please review the merge requests created
                    for this contribution
                </Row>
                <Row>
                    <Button onClick={() => navigate('/review')}>
                        Review Merge Requests
                    </Button>
                </Row>
            </>
        </ContributionStepper>
    )
}
