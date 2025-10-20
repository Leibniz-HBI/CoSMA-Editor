import { Col, ListGroup, Modal, Row, Spinner } from 'react-bootstrap'
import { ColumnNamePath, ColumnNamePathFromId } from '../column_menu/components/misc'
import { FormField } from '../util/form'
import { useDispatch, useSelector } from 'react-redux'
import { userSearch } from '../user/thunks'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { AppDispatch } from '../store'
import { selectSearchResults } from '../user/selectors'
import { debounce } from 'debounce'
import {
    acceptOwnershipRequest,
    deleteOwnershipRequest,
    getOwnershipRequests,
    putOwnershipRequest
} from './thunks'
import { selectPutColumnOwnership, selectColumnOwnershipRequests } from './selectors'
import { RemoteTriggerButton, CosmaeLoading, CosmaeCard } from '../util/components/misc'
import { PublicUserInfo } from '../user/state'
import { CheckCircle, XCircleFill } from 'react-bootstrap-icons'
import { putOwnershipRequestClear } from './slice'
import { OwnershipRequest } from './state'
import { RemoteInterface } from '../util/state'
import { userSearchClear } from '../user/slice'
import { updateColumn } from '../column_menu/slice'

export function ColumnManagementPage() {
    const dispatch: AppDispatch = useDispatch()
    useEffect(() => {
        dispatch(getOwnershipRequests())
    }, [])
    const ownershipRequests = useSelector(selectColumnOwnershipRequests)
    if (ownershipRequests.isLoading) {
        return <CosmaeLoading />
    }
    return (
        <Row className="h-100 justify-content-around">
            <Col
                className="h-100 overflow-hidden d-flex flex-column ps-5 pe-5 pb-3"
                xs={6}
            >
                <Row className="pb-2"></Row>
                <CosmaeCard
                    className="h-50 d-flex flex-column overflow-hidden"
                    header={
                        <span>
                            You were petitioned to accept the ownership for the
                            following columns:
                        </span>
                    }
                >
                    <Col className="h-100 d-flex flex-column overflow-hidden flex-grow-0">
                        <Row className="overflow-y-scroll flex-basis-0 flex-grow-1 ms-2 me-2">
                            <ListGroup>
                                {ownershipRequests.value.received.map(
                                    (request, idx) => (
                                        <ListGroup.Item
                                            key={`ownership-received-${idx}`}
                                        >
                                            <ColumnOwnershipRequestListItemBody
                                                request={request}
                                                isReceiver={true}
                                            />
                                        </ListGroup.Item>
                                    )
                                )}
                            </ListGroup>
                        </Row>
                    </Col>
                </CosmaeCard>
                <Row className="pt-2 pb-4"></Row>
                <CosmaeCard
                    className="h-50 d-flex flex-column overflow-hidden"
                    header={
                        <span>
                            You requested a new owner for the following columns:
                        </span>
                    }
                >
                    <Col className="h-100 d-flex flex-column overflow-hidden flex-grow-0">
                        <Row className="overflow-y-scroll flex-grow-1 ms-2 me-2">
                            <ListGroup>
                                {ownershipRequests.value.petitioned.map(
                                    (request, idx) => (
                                        <ListGroup.Item
                                            key={`ownership-petitioned-${idx}`}
                                        >
                                            <ColumnOwnershipRequestListItemBody
                                                request={request}
                                                isReceiver={false}
                                            />
                                        </ListGroup.Item>
                                    )
                                )}
                            </ListGroup>
                        </Row>
                    </Col>
                </CosmaeCard>
            </Col>
        </Row>
    )
}

export function ColumnOwnershipRequestListItemBody({
    request,
    isReceiver
}: {
    request: RemoteInterface<OwnershipRequest>
    isReceiver: boolean
}) {
    const dispatch: AppDispatch = useDispatch()
    let otherPartyLabel, otherParty, tailElements
    if (isReceiver) {
        otherPartyLabel = 'Petitioner: '
        otherParty = request.value.petitioner.username
        tailElements = (
            <Row>
                <RemoteTriggerButton
                    label="Accept"
                    isLoading={request.errorMsg !== undefined}
                    onClick={() =>
                        dispatch(
                            acceptOwnershipRequest(request.value.idPersistent)
                        ).then((columnDefinition) => {
                            if (columnDefinition !== undefined) {
                                dispatch(updateColumn(columnDefinition))
                            }
                        })
                    }
                />
            </Row>
        )
    } else {
        otherPartyLabel = 'Recipient: '
        otherParty = request.value.receiver.username
        tailElements = (
            <Row>
                <RemoteTriggerButton
                    label="Withdraw"
                    isLoading={request.errorMsg !== undefined}
                    onClick={() =>
                        dispatch(deleteOwnershipRequest(request.value.idPersistent))
                    }
                />
            </Row>
        )
    }
    return (
        <Row>
            <Col>
                <Row>
                    <Col>
                        <ColumnNamePath column={request.value.column} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <span>{otherPartyLabel}</span>
                        <span className="fw-bold">{otherParty}</span>
                    </Col>
                </Row>
            </Col>
            <Col>{tailElements}</Col>
        </Row>
    )
}

const debouncedSearchDispatch = debounce(
    (searchTerm: string, dispatch: AppDispatch) => dispatch(userSearch(searchTerm)),
    400
)

const debouncedSearchDispatchThunk = (searchTerm: string) => (dispatch: AppDispatch) =>
    debouncedSearchDispatch(searchTerm, dispatch)

export function ChangeOwnershipModal({
    idColumnPersistent,
    onClose
}: {
    idColumnPersistent?: string
    onClose: VoidFunction
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const dispatch: AppDispatch = useDispatch()
    const closeCallback = () => {
        dispatch(putOwnershipRequestClear())
        dispatch(userSearchClear())
        onClose()
    }
    const searchResults = useSelector(selectSearchResults)
    return (
        <Modal show={idColumnPersistent !== undefined} onHide={closeCallback}>
            <Modal.Header closeButton={true} closeVariant="white">
                Change Column Ownership
            </Modal.Header>
            <Modal.Body>
                {idColumnPersistent === undefined ? (
                    <div />
                ) : (
                    <Col>
                        <Row>
                            <span>Change ownership of column with name path</span>
                            <ColumnNamePathFromId
                                idColumnPersistent={idColumnPersistent}
                            />
                        </Row>
                        <Row>
                            <FormField
                                name="search-user"
                                label="Search User"
                                value={searchTerm}
                                handleChange={(e: ChangeEvent) => {
                                    const searchTerm = (e.target as HTMLInputElement)
                                        .value
                                    setSearchTerm(searchTerm)
                                    dispatch(debouncedSearchDispatchThunk(searchTerm))
                                }}
                            />
                        </Row>
                        <Row>
                            {searchResults !== undefined && (
                                <ListGroup>
                                    {searchResults.value.map((userInfo, idx) => (
                                        <ListGroup.Item key={`search-result-${idx}`}>
                                            <OwnershipSearchResultsItem
                                                userInfo={userInfo}
                                                idColumnPersistent={idColumnPersistent}
                                            />
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}
                        </Row>
                    </Col>
                )}
            </Modal.Body>
        </Modal>
    )
}

export function OwnershipSearchResultsItem({
    userInfo,
    idColumnPersistent
}: {
    userInfo: PublicUserInfo
    idColumnPersistent: string
}) {
    const dispatch: AppDispatch = useDispatch()
    const putOwnershipRequestState = useSelector(selectPutColumnOwnership)
    const callback = () => {
        if (putOwnershipRequestState.isLoading) {
            return
        }
        dispatch(
            putOwnershipRequest({
                idUserPersistent: userInfo.idPersistent,
                idColumnPersistent: idColumnPersistent
            })
        )
    }
    const tailElementRef = useRef(null)
    let tailElement
    if (userInfo.idPersistent == putOwnershipRequestState.value?.idUserPersistent) {
        if (putOwnershipRequestState.isLoading) {
            tailElement = <Spinner />
        } else if (putOwnershipRequestState.errorMsg !== undefined) {
            tailElement = (
                <>
                    <span
                        className="icon text-danger"
                        data-testid="put-ownership-error"
                    >
                        <XCircleFill />
                    </span>
                </>
            )
        } else {
            tailElement = (
                <span className="icon text-primary" data-testid="put-ownership-success">
                    <CheckCircle />
                </span>
            )
        }
    }
    return (
        <Row onClick={callback}>
            <Col>{userInfo.username}</Col>
            <Col xs="1" ref={tailElementRef}>
                {tailElement}
            </Col>
        </Row>
    )
}
