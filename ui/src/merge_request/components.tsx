import { useLayoutEffect } from 'react'
import { useMergeRequests } from './hooks'
import { CosmaeLoading } from '../util/components/misc'
import { Col, ListGroup, Row } from 'react-bootstrap'
import { MergeRequest } from './state'

export function ReviewList() {
    const { getMergeRequestsCallback, isLoading, assigned } = useMergeRequests()
    useLayoutEffect(() => {
        getMergeRequestsCallback()
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    if (isLoading) {
        return <CosmaeLoading />
    }
    return (
        <Col>
            <Row className="mt-4 ms-2" key="merge-request-assigned-heading">
                Assigned to you
            </Row>
            <Row className="ms-2" key="merge-request-assigned-list">
                <ListGroup>
                    {assigned.map((mergeRequest) => (
                        <MergeRequestListItem mergeRequest={mergeRequest} />
                    ))}
                </ListGroup>
            </Row>
            <Row className="mt-4 ms-2" key="merge-request-created-heading">
                Created by you
            </Row>
            <Row className="ms-2" key="merge-request-created-list">
                <ListGroup as="ol">
                    {assigned.map((mergeRequest) => (
                        <MergeRequestListItem mergeRequest={mergeRequest} />
                    ))}
                </ListGroup>
            </Row>
        </Col>
    )
}

export function MergeRequestListItem({ mergeRequest }: { mergeRequest: MergeRequest }) {
    return (
        <ListGroup.Item as="li" key={`${mergeRequest.idPersistent}`}>
            {`${mergeRequest.createdBy.userName} wants to merge \n` +
                `${mergeRequest.originTagDefinition.namePath[0]} \n` +
                `into ${mergeRequest.destinationTagDefinition.namePath[0]}`}
        </ListGroup.Item>
    )
}
