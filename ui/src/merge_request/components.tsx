import { useLayoutEffect } from 'react'
import { useMergeRequests } from './hooks'
import { CosmaeLoading } from '../util/components/misc'
import { Badge, Col, ListGroup, Row } from 'react-bootstrap'
import { MergeRequest } from './state'
import { NavigateFunction, useNavigate } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircleFill } from 'react-bootstrap-icons'
import { constructColumnTitleSpans } from '../column_menu/components/selection'

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
                Opened by you
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
            <Row>
                <Col xs={1} className="align-self-center">
                    <Row>
                        <Badge>{mergeRequest.step}</Badge>
                    </Row>
                </Col>
                <Col className="align-self-center ms-2">
                    <MergeRequestListItemBody mergeRequest={mergeRequest} />
                </Col>
                <Col xs={2}>
                    <Row>
                        <span>Opened by:</span>
                        <span className="fw-bold">{`${mergeRequest.createdBy.userName}`}</span>
                    </Row>
                </Col>
            </Row>
        </ListGroup.Item>
    )
}
export function MergeRequestListItemBody({
    mergeRequest
}: {
    mergeRequest: MergeRequest
}) {
    return (
        <Row>
            <Col>
                <Row>
                    <Col xs="auto">
                        <ArrowRightCircleFill />
                    </Col>
                    <Col className="ps-0">
                        <span className="fw-bold">
                            {constructColumnTitleSpans(
                                mergeRequest.destinationTagDefinition.namePath
                            )}
                        </span>
                    </Col>
                </Row>
                <Row>
                    <Col xs="auto">
                        <ArrowLeftCircle />
                    </Col>
                    <Col className="ps-0">
                        <span>
                            {constructColumnTitleSpans(
                                mergeRequest.originTagDefinition.namePath
                            )}
                        </span>
                    </Col>
                </Row>
            </Col>
        </Row>
    )
}
