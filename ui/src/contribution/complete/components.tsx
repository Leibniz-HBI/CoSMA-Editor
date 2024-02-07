import { useNavigate } from 'react-router-dom'
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
        <>
            <Row className="justify-content-center">
                All entities were assigned. Please review the merge requests created for
                this contribution
            </Row>
            <Row className="justify-content-center">
                <Button onClick={() => navigate('/review')}>
                    Review Merge Requests
                </Button>
            </Row>
        </>
    )
}
