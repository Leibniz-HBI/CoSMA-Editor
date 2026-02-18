import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '../../store'
import { useEffect } from 'react'
import { getEntityMergeRequests } from './thunks'
import { selectEntityMergeRequests } from './selector'
import { CosmaeLoading } from '../../util/components/misc'
import { Badge, Col, ListGroup, Row } from 'react-bootstrap'
import { EntityMergeRequest } from './state'
import { NavigateFunction, useNavigate } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircleFill } from 'react-bootstrap-icons'

export function EntityMergeRequests() {
    const navigateCallback = useNavigate()
    const dispatch: AppDispatch = useDispatch()
    useEffect(
        () => {
            dispatch(getEntityMergeRequests())
        },
        []
    )
    const remoteEntityMergeRequests = useSelector(selectEntityMergeRequests)
    const entityMergeRequestValue = remoteEntityMergeRequests.value
    if (remoteEntityMergeRequests.isLoading || entityMergeRequestValue === undefined) {
        return <CosmaeLoading />
    }
    return (
        <ListGroup>
            {entityMergeRequestValue.map((mr) => (
                <EntityMergeRequestListItem
                    mergeRequest={mr}
                    navigateCallback={navigateCallback}
                    key={mr.idPersistent}
                />
            ))}
        </ListGroup>
    )
}

export function EntityMergeRequestListItem({
    mergeRequest,
    navigateCallback
}: {
    mergeRequest: EntityMergeRequest
    navigateCallback: NavigateFunction
}) {
    return (
        <ListGroup.Item
            as="li"
            onClick={() =>
                navigateCallback('/review/entities/' + mergeRequest.idPersistent)
            }
            role="button"
        >
            <Row>
                <Col xs={1} className="align-self-center">
                    <Row>
                        <Badge>{mergeRequest.state}</Badge>
                    </Row>
                </Col>
                <Col className="align-self-center ms-2">
                    <EntityMergeRequestListItemBody mergeRequest={mergeRequest} />
                </Col>
                <Col xs={3}>
                    <Row>
                        <span>Opened by:</span>
                        <span className="fw-bold">{`${mergeRequest.createdBy.username}`}</span>
                    </Row>
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

export function EntityMergeRequestListItemBody({
    mergeRequest
}: {
    mergeRequest: EntityMergeRequest
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
                            {mergeRequest.entityDestination.displayTxt}
                        </span>
                    </Col>
                </Row>
                <Row>
                    <Col xs="auto">
                        <ArrowLeftCircle />
                    </Col>
                    <Col className="ps-0">
                        <span>{mergeRequest.entityOrigin.displayTxt}</span>
                    </Col>
                </Row>
            </Col>
        </Row>
    )
}
