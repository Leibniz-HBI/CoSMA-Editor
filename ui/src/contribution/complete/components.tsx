import { useNavigate } from 'react-router-dom'
import { ContributionStepper } from '../components'
import { Button, Row } from 'react-bootstrap'
import { useAppSelector } from '../../hooks'
import { selectContribution } from '../selectors'
import { CosmaeLoading } from '../../util/components/misc'

export function CompleteStep() {
    const contribution = useAppSelector(selectContribution)
    const navigate = useNavigate()
    if (contribution.value === undefined || contribution.isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ContributionStepper selectedIdx={3}>
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
