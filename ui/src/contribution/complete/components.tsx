import { useNavigate } from 'react-router-dom'
import { ContributionStepper } from '../components'
import { Button, Row } from 'react-bootstrap'
import { useAppSelector } from '../../hooks'
import { selectContribution } from '../selectors'
import { CosmaeLoading } from '../../util/components/misc'

export function CompleteStep() {
    const contribution = useAppSelector(selectContribution)
    const navigate = useNavigate()
    let body
    if (contribution.value === undefined || contribution.isLoading) {
        body = <CosmaeLoading />
    } else {
        body = (
            <>
                <Row className="justify-content-center">
                    All entities were assigned. Please review the merge requests created
                    for this contribution
                </Row>
                <Row className="justify-content-center">
                    <Button onClick={() => navigate('/review')}>
                        Review Merge Requests
                    </Button>
                </Row>
            </>
        )
    }
    return <ContributionStepper selectedIdx={3}>{body}</ContributionStepper>
}
