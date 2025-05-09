import { useLayoutEffect } from 'react'
import { CosmaeLoading, CosmaeCard } from '../util/components/misc'
import { Badge, Col, ListGroup, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import { MergeRequest } from './state'
import { NavigateFunction, useNavigate } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircleFill } from 'react-bootstrap-icons'
import { ColumnNamePath } from '../column_menu/components/misc'
import { AppDispatch } from '../store'
import { useDispatch, useSelector } from 'react-redux'
import { selectPermissionGroup } from '../auth/selectors'
import { UserPermissionGroup } from '../user/state'
import { getEntityMergeRequests } from './entity/thunks'
import { EntityMergeRequests } from './entity/components'
import { getColumnMergeRequests } from './thunks'
import {
    selectColumnMergeRequestByCategory,
    selectColumnMergeRequestsIsLoading
} from './selectors'
import { useAppSelector } from '../hooks'

export function ReviewList() {
    const dispatch: AppDispatch = useDispatch()
    const permissionGroup = useSelector(selectPermissionGroup)
    const isLoading = useAppSelector(selectColumnMergeRequestsIsLoading)
    const { assigned, created } = useAppSelector(selectColumnMergeRequestByCategory)
    useLayoutEffect(() => {
        if (isLoading) {
            return
        }
        dispatch(getColumnMergeRequests())
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
        <div className="grid-r-1fr-1fr-c-1fr-1fr flex-grow-1 flex-shrink-1 overflow-hidden pb-3">
            <div
                className="d-grid grid-row-1 grid-col-1 overflow-hidden pe-1 ps-1"
                key="merge-request-assigned-list"
            >
                <CosmaeCard header={<h5>Column Merge Requests Assigned to You</h5>}>
                    <div className="overflow-y-scroll mb-3">
                        <ListGroup>
                            {assigned.map((mergeRequest) => (
                                <MergeRequestListItem
                                    mergeRequest={mergeRequest}
                                    navigateCallback={navigateCallback}
                                    key={`${mergeRequest.idPersistent}`}
                                />
                            ))}
                        </ListGroup>
                    </div>
                </CosmaeCard>
            </div>
            <div
                className="d-grid grid-row-2 grid-col-1 overflow-hidden pe-1 ps-1"
                key="merge-request-created-list"
            >
                <CosmaeCard header={<h5>Column Merge Requests Opened by You</h5>}>
                    <div className="overflow-y-scroll mb-1">
                        <ListGroup as="ol">
                            {created.map((mergeRequest) => (
                                <MergeRequestListItem
                                    mergeRequest={mergeRequest}
                                    navigateCallback={navigateCallback}
                                    key={`${mergeRequest.idPersistent}`}
                                />
                            ))}
                        </ListGroup>
                    </div>
                </CosmaeCard>
            </div>
            {(permissionGroup === UserPermissionGroup.EDITOR ||
                permissionGroup === UserPermissionGroup.COMMISSIONER) && (
                <div className="d-flex flex-column grid-row-1-3 grid-col-2 ps-1 pe-1">
                    <CosmaeCard header={<h5>Entity Merge Requests</h5>}>
                        <div className="flex-shrink-1 flex-grow-1 overflow-y-scroll">
                            <EntityMergeRequests />
                        </div>
                    </CosmaeCard>
                </div>
            )}
        </div>
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
                navigateCallback('/review/columns/' + mergeRequest.idPersistent)
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
                <OverlayTrigger
                    placement="bottom"
                    overlay={
                        <Tooltip>
                            The destination column, to where data will be written.
                        </Tooltip>
                    }
                >
                    <Row>
                        <Col xs="auto">
                            <ArrowRightCircleFill />
                        </Col>
                        <Col className="ps-0">
                            <span className="fw-bold">
                                <ColumnNamePath
                                    column={mergeRequest.destinationColumn}
                                />
                            </span>
                        </Col>
                    </Row>
                </OverlayTrigger>
                <OverlayTrigger
                    placement="bottom"
                    overlay={
                        <Tooltip>The origin column, from where data is used.</Tooltip>
                    }
                >
                    <Row>
                        <Col xs="auto">
                            <ArrowLeftCircle />
                        </Col>
                        <Col className="ps-0">
                            <ColumnNamePath column={mergeRequest.originColumn} />
                        </Col>
                    </Row>
                </OverlayTrigger>
            </Col>
        </Row>
    )
}
