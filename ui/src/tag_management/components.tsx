import { Col, ListGroup, Modal, Row, Spinner } from 'react-bootstrap'
import { TagDefinition } from '../column_menu/state'
import { constructColumnTitleSpans } from '../column_menu/components/selection'
import { FormField } from '../util/form'
import { useDispatch, useSelector } from 'react-redux'
import { userSearch } from '../user/thunks'
import { ChangeEvent, MutableRefObject, useEffect, useRef, useState } from 'react'
import { AppDispatch } from '../store'
import { selectSearchResults } from '../user/selectors'
import { debounce } from 'debounce'
import {
    acceptOwnershipRequest,
    deleteOwnershipRequest,
    getOwnershipRequests,
    putOwnershipRequest
} from './thunks'
import { selectPutTagOwnership, selectTagOwnershipRequests } from './selectors'
import { RemoteTriggerButton, CosmaeLoading, CosmaeCard } from '../util/components/misc'
import { PublicUserInfo } from '../user/state'
import { CheckCircle, XCircleFill } from 'react-bootstrap-icons'
import { ErrorPopover } from '../util/error/components'
import { putOwnershipRequestClear, putOwnershipRequestErrorClear } from './slice'
import { OwnershipRequest } from './state'
import { Remote, RemoteInterface } from '../util/state'
import { updateUserTagDefinition, userSearchClear } from '../user/slice'

export function TagManagementPage() {
    const dispatch: AppDispatch = useDispatch()
    useEffect(
        () => {
            dispatch(getOwnershipRequests())
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )
    const ownershipRequests = useSelector(selectTagOwnershipRequests)
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
                    text="You were petitioned to accept the ownership for the
                                following tags:"
                >
                    <Row className="overflow-y-scroll flex-basis-0 flex-grow-1 ms-2 me-2">
                        <ListGroup>
                            {ownershipRequests.value.received.map((request, idx) => (
                                <ListGroup.Item key={`ownership-received-${idx}`}>
                                    <TagOwnershipRequestListItemBody
                                        request={request}
                                        isReceiver={true}
                                    />
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Row>
                </CosmaeCard>
                <Row className="pt-2 pb-4"></Row>
                <CosmaeCard
                    className="h-50 d-flex flex-column overflow-hidden"
                    text="You requested a new owner for the following tag definitions:"
                >
                    <Row className="overflow-y-scroll flex-basis-0 flex-grow-1 ms-2 me-2">
                        <ListGroup>
                            {ownershipRequests.value.petitioned.map((request, idx) => (
                                <ListGroup.Item key={`ownership-petitioned-${idx}`}>
                                    <TagOwnershipRequestListItemBody
                                        request={request}
                                        isReceiver={false}
                                    />
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Row>
                </CosmaeCard>
            </Col>
        </Row>
    )
}

export function TagOwnershipRequestListItemBody({
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
        otherParty = request.value.petitioner.userName
        tailElements = (
            <Row>
                <RemoteTriggerButton
                    normalLabel="Accept"
                    successLabel="Accepted"
                    remoteState={new Remote(request.errorMsg !== undefined)}
                    onClick={() =>
                        dispatch(
                            acceptOwnershipRequest(request.value.idPersistent)
                        ).then((tagDefinition) => {
                            if (tagDefinition !== undefined) {
                                dispatch(updateUserTagDefinition(tagDefinition))
                            }
                        })
                    }
                />
            </Row>
        )
    } else {
        otherPartyLabel = 'Recipient: '
        otherParty = request.value.receiver.userName
        tailElements = (
            <Row>
                <RemoteTriggerButton
                    normalLabel="Withdraw"
                    successLabel="Withdrawn"
                    remoteState={new Remote(request.errorMsg !== undefined)}
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
                        {constructColumnTitleSpans(
                            request.value.tagDefinition.namePath
                        )}
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
    tagDefinition,
    onClose,
    updateTagDefinitionChangeCallback
}: {
    tagDefinition?: TagDefinition
    onClose: VoidFunction
    updateTagDefinitionChangeCallback: (tagDefinition: TagDefinition) => void
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const dispatch: AppDispatch = useDispatch()
    const closeCallback = () => {
        dispatch(putOwnershipRequestClear())
        dispatch(userSearchClear())
        onClose()
    }
    const searchResults = useSelector(selectSearchResults)
    const modalBodyRef = useRef(null)
    return (
        <Modal show={tagDefinition !== undefined} onHide={closeCallback}>
            <Modal.Header closeButton={true} closeVariant="white">
                Change Tag Ownership
            </Modal.Header>
            <Modal.Body ref={modalBodyRef}>
                {tagDefinition === undefined ? (
                    <div />
                ) : (
                    <Col>
                        <Row>
                            <span>
                                Change ownership of tag definition with name path
                            </span>
                            {constructColumnTitleSpans(tagDefinition?.namePath)}
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
                                                idTagDefinitionPersistent={
                                                    tagDefinition.idPersistent
                                                }
                                                containerRef={modalBodyRef}
                                                updateTagDefinitionChangeCallback={
                                                    updateTagDefinitionChangeCallback
                                                }
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
    idTagDefinitionPersistent,
    containerRef,
    updateTagDefinitionChangeCallback
}: {
    userInfo: PublicUserInfo
    idTagDefinitionPersistent: string
    containerRef: MutableRefObject<null>
    updateTagDefinitionChangeCallback: (tagDefinition: TagDefinition) => void
}) {
    const dispatch: AppDispatch = useDispatch()
    const putOwnershipRequestState = useSelector(selectPutTagOwnership)
    const callback = () => {
        if (putOwnershipRequestState.isLoading) {
            return
        }
        dispatch(
            putOwnershipRequest({
                idUserPersistent: userInfo.idPersistent,
                idTagDefinitionPersistent: idTagDefinitionPersistent
            })
        ).then((tagDefinition) => {
            if (tagDefinition !== undefined) {
                updateTagDefinitionChangeCallback(tagDefinition)
            }
        })
    }
    const tailElementRef = useRef(null)
    let tailElement
    let showError = false
    if (userInfo.idPersistent == putOwnershipRequestState.value?.idUserPersistent) {
        if (putOwnershipRequestState.isLoading) {
            tailElement = <Spinner />
        } else if (putOwnershipRequestState.errorMsg !== undefined) {
            showError = true
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
            <Col>{userInfo.userName}</Col>
            <Col xs="1" ref={tailElementRef}>
                <>
                    {tailElement}
                    <ErrorPopover
                        errorState={{ msg: putOwnershipRequestState.errorMsg ?? '' }}
                        placement="top"
                        show={showError}
                        targetRef={tailElementRef}
                        containerRef={containerRef}
                        clearError={(e) => {
                            e.stopPropagation()
                            dispatch(
                                putOwnershipRequestErrorClear({
                                    idUserPersistent: userInfo.idPersistent,
                                    idTagDefinitionPersistent: idTagDefinitionPersistent
                                })
                            )
                            return true
                        }}
                    />
                </>
            </Col>
        </Row>
    )
}
