import { useLayoutEffect } from 'react'
import { useMergeRequests } from './hooks'
import { CosmaeLoading } from '../util/components/misc'
import { Col, ListGroup, Row } from 'react-bootstrap'
import { MergeRequest } from './state'
import { NavigateFunction, useNavigate } from 'react-router-dom'
import { StringFunction } from '../util/type'

export function ReviewList() {
    const { getMergeRequestsCallback, isLoading, assigned } = useMergeRequests()
    useLayoutEffect(() => {
        getMergeRequestsCallback()
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const navigateCallback = useNavigate()
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
                        <MergeRequestListItem
                            mergeRequest={mergeRequest}
                            navigateCallback={navigateCallback}
                            key={`${mergeRequest.idPersistent}`}
                        />
                    ))}
                </ListGroup>
            </Row>
            <Row className="mt-4 ms-2" key="merge-request-created-heading">
                Created by you
            </Row>
            <Row className="ms-2" key="merge-request-created-list">
                <ListGroup as="ol">
                    {assigned.map((mergeRequest) => (
                        <MergeRequestListItem
                            mergeRequest={mergeRequest}
                            navigateCallback={navigateCallback}
                            key={`${mergeRequest.idPersistent}`}
                        />
                    ))}
                </ListGroup>
            </Row>
        </Col>
    )
}

export function MergeRequestListItem({
    mergeRequest,
    navigateCallback
}: {
    mergeRequest: MergeRequest
    navigateCallback: NavigateFunction
}) {
    return (
        <ListGroup.Item
            as="li"
            onClick={() => navigateCallback('/review/' + mergeRequest.idPersistent)}
        >
            {`${mergeRequest.createdBy.userName} wants to merge \n` +
                `${mergeRequest.originTagDefinition.namePath[0]} \n` +
                `into ${mergeRequest.destinationTagDefinition.namePath[0]}`}
        </ListGroup.Item>
    )
}
