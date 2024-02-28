import { useLayoutEffect } from 'react'
import { CosmaeLoading, CosmaeCard } from '../util/components/misc'
import { Badge, Col, ListGroup, Row } from 'react-bootstrap'
import { MergeRequest } from './state'
import { NavigateFunction, useNavigate } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircleFill } from 'react-bootstrap-icons'
import { constructColumnTitleSpans } from '../column_menu/components/selection'
import { AppDispatch } from '../store'
import { useDispatch, useSelector } from 'react-redux'
import { selectPermissionGroup } from '../user/selectors'
import { UserPermissionGroup } from '../user/state'
import { getEntityMergeRequests } from './entity/thunks'
import { EntityMergeRequests } from './entity/components'
import { getTagMergeRequests } from './thunks'
import {
    selectTagMergeRequestByCategory,
    selectTagMergeRequestsIsLoading
} from './selectors'
import { useAppSelector } from '../hooks'

export function ReviewList() {
    const dispatch: AppDispatch = useDispatch()
    const permissionGroup = useSelector(selectPermissionGroup)
    const isLoading = useAppSelector(selectTagMergeRequestsIsLoading)
    const { assigned, created } = useAppSelector(selectTagMergeRequestByCategory)
    useLayoutEffect(() => {
        if (isLoading) {
            return
        }
        dispatch(getTagMergeRequests())
        if (
            permissionGroup === UserPermissionGroup.EDITOR ||
            permissionGroup === UserPermissionGroup.COMMISSIONER
        ) {
            dispatch(getEntityMergeRequests())
        }
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const navigateCallback = useNavigate()
    if (isLoading) {
        return <CosmaeLoading />
    }
    return (
        <Row className="justify-content-center h-100">
            <Col className="h-100 overflow-hidden d-flex flex-column pb-3" xs={6}>
                <Row className="mb-4 h-50" key="merge-request-assigned-list">
                    <Col>
                        <CosmaeCard
                            title="Tag Definition Merge Requests Assigned to You"
                            className="h-100 d-flex flex-column overflow-hidden"
                        >
                            <Row className="overflow-y-scroll flex-basis-0 flex-grow-1 ms-2 me-2">
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
                        </CosmaeCard>
                    </Col>
                </Row>
                <Row className="h-50" key="merge-request-created-list">
                    <Col>
                        <CosmaeCard
                            title="Tag Definition Merge Requests Opened by You"
                            className="h-100 d-flex flex-column overflow-hidden"
                        >
                            <Row className="overflow-y-scroll flex-basis-0 flex-grow-1 ms-2 me-2">
                                <ListGroup as="ol">
                                    {created.map((mergeRequest) => (
                                        <MergeRequestListItem
                                            mergeRequest={mergeRequest}
                                            navigateCallback={navigateCallback}
                                            key={`${mergeRequest.idPersistent}`}
                                        />
                                    ))}
                                </ListGroup>
                            </Row>
                        </CosmaeCard>
                    </Col>
                </Row>
            </Col>
            {(permissionGroup === UserPermissionGroup.EDITOR ||
                permissionGroup === UserPermissionGroup.COMMISSIONER) && (
                <Col className="h-100 overflow-hidden d-flex flex-column  pb-3" xs={5}>
                    <CosmaeCard
                        title="Entity Merge Requests"
                        className="h-100 d-flex flex-column overflow-hidden"
                    >
                        <Row className="overflow-y-scroll flex-basis-0 flex-grow-1 ms-2 me-2">
                            <EntityMergeRequests />
                        </Row>
                    </CosmaeCard>
                </Col>
            )}
        </Row>
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
            onClick={() =>
                navigateCallback('/review/tags/' + mergeRequest.idPersistent)
            }
            role="button"
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
                        <span className="fw-bold">{`${mergeRequest.createdBy.username}`}</span>
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
