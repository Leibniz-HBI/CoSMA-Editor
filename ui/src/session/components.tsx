import {
    Badge,
    Button,
    Col,
    ListGroup,
    OverlayTrigger,
    Popover,
    Row,
    Spinner,
    Tooltip
} from 'react-bootstrap'
import {
    ArrowLeftShort,
    CheckCircle,
    Floppy2Fill,
    PeopleFill,
    PersonFill,
    PlusLg,
    XCircle
} from 'react-bootstrap-icons'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
    selectAddEditSessionParticipant,
    selectedEditSessionParticipantIds,
    selectEditSessionOwnerList,
    selectCurrentEditSessionName,
    selectCurrentEditSessionParticipantList,
    selectEditSessionParticipantNumber,
    selectIdCurrentEditSessionPersistent,
    selectParticipantSearchResults,
    selectEditSessionParticipantList
} from './selectors'
import { CosmaeLoading } from '../util/components/misc'
import { ChangeEvent, useEffect, useState } from 'react'
import {
    addEditSessionParticipantThunk,
    createEditSessionThunk,
    getEditSessionOwnerListThunk,
    getEditSessionParticipantListThunk,
    patchEditSessionThunk,
    removeEditSessionParticipantThunk,
    searchEditSessionParticipantThunk
} from './thunks'
import { Placement } from 'react-bootstrap/esm/types'
import { FormField } from '../util/form'
import { debounce } from 'debounce'
import { AppDispatch } from '../store'
import {
    EditSession,
    EditSessionParticipant,
    EditSessionParticipantType,
    newEditSessionParticipant
} from './state'
import { clearParticipantSearchResults } from './slice'
import { TabView } from '../util/components/tabs'
import { selectUserInfo } from '../auth/selectors'
import { setCurrentEditSessionThunk } from '../user/thunks'

export function EditSessionButton({
    popoverPlacement,
    tooltipPlacement
}: {
    popoverPlacement: Placement
    tooltipPlacement: Placement
}) {
    const countParticipants = useAppSelector(selectEditSessionParticipantNumber)
    return (
        <OverlayTrigger
            trigger="click"
            rootClose
            placement={popoverPlacement}
            overlay={
                <Popover className="vh-65 me-5">
                    <EditSessionTabs />
                </Popover>
            }
        >
            <div>
                <OverlayTrigger
                    placement={tooltipPlacement}
                    overlay={<Tooltip>Click to manage edit sessions</Tooltip>}
                    delay={{ show: 250, hide: 400 }}
                    rootClose
                >
                    <Badge
                        pill
                        bg="primary"
                        aria-label="manage edit sessions"
                        role="button"
                    >
                        <Row className="text-secondary fs-5">
                            {countParticipants < 2 ? (
                                <Col>
                                    <Row className="align-items-start">
                                        <Col className="pe-0 mb-1 align-self-center">
                                            <PersonFill />
                                        </Col>
                                        <Col className="ps-0 align-self-center mb-1">
                                            <PlusLg />
                                        </Col>
                                    </Row>
                                </Col>
                            ) : (
                                <Col>
                                    <Row className="align-items-start">
                                        <Col className="pe-0 mb-1 align-self-center">
                                            <PeopleFill />
                                        </Col>
                                        <Col className="ps-1 align-self-center mb-1">
                                            {countParticipants}
                                        </Col>
                                    </Row>
                                </Col>
                            )}
                        </Row>
                    </Badge>
                </OverlayTrigger>
            </div>
        </OverlayTrigger>
    )
}

export function EditSessionTabs() {
    const [tabIdx, setTabIdx] = useState(0)
    const backCallback = () => setTabIdx(0)
    return (
        <Col className="h-100 d-flex flex-column pt-2 pb-1 ">
            <TabView
                initialTabIdx={tabIdx}
                tabList={[
                    { name: 'Current', component: <EditSessionEditor /> },
                    {
                        name: 'Owner',
                        component: <EditSessionOwnerList backCallback={backCallback} />
                    },
                    {
                        name: 'Participant',
                        component: <EditSessionParticipantList />
                    }
                ]}
            />
        </Col>
    )
}

enum EditSessionEditorView {
    participants,
    add
}

export function EditSessionEditor() {
    const idCurrentEditSession = useAppSelector(selectIdCurrentEditSessionPersistent)
    const editSessionParticipantList = useAppSelector(
        selectCurrentEditSessionParticipantList
    )
    const [view, setView] = useState(EditSessionEditorView.participants)
    const [removeDialogForParticipant, setRemoveDialogForParticipant] = useState<
        EditSessionParticipant | undefined
    >(undefined)
    if (idCurrentEditSession === undefined) {
        return <></>
    }
    const backCallback = () => setView(EditSessionEditorView.participants)
    if (view === EditSessionEditorView.add) {
        return (
            <AddParticipantForm
                backCallback={backCallback}
                idCurrentEditSession={idCurrentEditSession}
            />
        )
    }
    if (removeDialogForParticipant !== undefined) {
        const closeDialogCallback = () => setRemoveDialogForParticipant(undefined)

        return (
            <ParticipantRemoveDialog
                participant={removeDialogForParticipant}
                closeDialogCallback={closeDialogCallback}
                idCurrentEditSessionPersistent={idCurrentEditSession}
            />
        )
    }
    return (
        <Col className="h-100 d-flex flex-column ps-3 pe-3">
            <Row className="flex-grow-0 pt-1">
                <EditSessionNameForm idEditSessionPersistent={idCurrentEditSession} />
            </Row>
            <Row className="flex-grow-0 align-items-center fw-bold ps-2 pe-2 pb-1">
                Participants of Current Edit Session
            </Row>
            <Row
                className="flex-grow-1 flex-shrink-1 scroll-gutter overflow-y-scroll ps-0 ms-0 me-0"
                aria-label="Edit Session Participant List"
            >
                <ListGroup>
                    {editSessionParticipantList?.map((participant, idx) => (
                        <EditSessionParticipantItem
                            key={idx}
                            participant={participant}
                            removeParticipantCallback={setRemoveDialogForParticipant}
                        />
                    ))}
                </ListGroup>
            </Row>
            <Row className="flex-grow-0 ps-3 pe-3">
                <Button
                    variant="outline-primary"
                    onClick={() => setView(EditSessionEditorView.add)}
                >
                    Add Participant
                </Button>
            </Row>
        </Col>
    )
}

export function CreateEditSessionForm() {
    const dispatch = useAppDispatch()
    const [name, setName] = useState<undefined | string>(undefined)
    return (
        <Col className="bg-secondary p-1 rounded">
            <FormField
                value={name ?? ''}
                label="Edit Session Name"
                name="Edit Session Name"
                handleChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                }
            />
            <Row className="ps-3 pe-3">
                <Button
                    variant="outline-primary"
                    onClick={() => dispatch(createEditSessionThunk(name))}
                >
                    New Edit Session
                </Button>
            </Row>
        </Col>
    )
}

export function EditSessionNameForm({
    idEditSessionPersistent
}: {
    idEditSessionPersistent: string
}) {
    const editSessionName = useAppSelector(selectCurrentEditSessionName)
    return (
        <EditSessionNameFormComponent
            editSessionName={editSessionName}
            idEditSessionPersistent={idEditSessionPersistent}
        />
    )
}

function EditSessionNameFormComponent({
    idEditSessionPersistent,
    editSessionName
}: {
    idEditSessionPersistent: string
    editSessionName: string | undefined
}) {
    const [name, setName] = useState(editSessionName ?? '')
    const dispatch = useAppDispatch()
    return (
        <Row className="me-0">
            <Col className="mt-2 pe-0">
                <FormField
                    value={name}
                    label="Edit Session Name"
                    name="Edit Session Name"
                    handleChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setName(e.target.value)
                    }
                />
            </Col>
            <Col
                xs="auto"
                className="text-primary button mt-4 pe-0"
                onClick={() =>
                    dispatch(patchEditSessionThunk({ idEditSessionPersistent, name }))
                }
            >
                <Floppy2Fill size="30px" />
            </Col>
        </Row>
    )
}

function EditSessionParticipantItem({
    participant,
    removeParticipantCallback
}: {
    participant: EditSessionParticipant
    removeParticipantCallback: (participant: EditSessionParticipant) => void
}) {
    return (
        <ListGroup.Item>
            <Row className="justify-content-between">
                <Col>{participant.name}</Col>
                <Col
                    xs="auto"
                    className="text-danger button"
                    onClick={() => removeParticipantCallback(participant)}
                    role="button"
                >
                    <XCircle />
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

function ParticipantRemoveDialog({
    participant,
    closeDialogCallback,
    idCurrentEditSessionPersistent
}: {
    participant: EditSessionParticipant
    closeDialogCallback: VoidFunction
    idCurrentEditSessionPersistent: string
}) {
    const dispatch = useAppDispatch()
    return (
        <Col className="ms-3 me-3">
            <Row className="mb-4">
                {`This will remove ${participant.name} from all existing edits made with the
                current edit session.`}
            </Row>
            <Row>
                <Button
                    variant="outline-primary"
                    onClick={() => {
                        dispatch(
                            removeEditSessionParticipantThunk(
                                idCurrentEditSessionPersistent,
                                participant
                            )
                        ).then((result) => {
                            if (result) {
                                closeDialogCallback()
                            }
                        })
                    }}
                >
                    Remove Participant
                </Button>
            </Row>
            <Row>
                <Button onClick={closeDialogCallback}>Cancel</Button>
            </Row>
        </Col>
    )
}

const debouncedSearchDispatch = debounce(
    (searchTerm: string, dispatch: AppDispatch) =>
        dispatch(searchEditSessionParticipantThunk(searchTerm)),
    400
)

const debouncedSearchDispatchThunk = (searchTerm: string) => (dispatch: AppDispatch) =>
    debouncedSearchDispatch(searchTerm, dispatch)

export function AddParticipantForm({
    backCallback,
    idCurrentEditSession
}: {
    backCallback: VoidFunction
    idCurrentEditSession: string
}) {
    const [searchString, setSearchString] = useState('')
    const dispatch = useAppDispatch()
    return (
        <Col className="h-100 d-flex flex-column ms-3 me-3">
            <Row className="justify-content-start flex-grow-0">
                <Col
                    xs="auto"
                    role="button"
                    onClick={() => {
                        dispatch(clearParticipantSearchResults())
                        backCallback()
                    }}
                >
                    <ArrowLeftShort size="30px" />
                </Col>
            </Row>
            <Row className="flex-grow-0">
                <FormField
                    label="Search Participant"
                    name="Add participant"
                    value={searchString}
                    handleChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const searchTerm = e.target.value
                        setSearchString(searchTerm)
                        debouncedSearchDispatchThunk(searchTerm)(dispatch)
                    }}
                ></FormField>
            </Row>
            <Row className="flex-grow-1 flex-shrink-1 overflow-y-scroll scroll-gutter">
                <ParticipantSearchResults idCurrentEditSession={idCurrentEditSession} />
            </Row>
            <Row className="flex-grow-0 mb-1">
                Adding a participant to an edit session will attribute co-authorship for
                past and future edits of this session.
            </Row>
        </Col>
    )
}

export function ParticipantSearchResults({
    idCurrentEditSession
}: {
    idCurrentEditSession: string
}) {
    const searchResults = useAppSelector(selectParticipantSearchResults)
    const participantIds = useAppSelector(selectedEditSessionParticipantIds)
    const addingParticipant = useAppSelector(selectAddEditSessionParticipant)
    const dispatch = useAppDispatch()
    function addParticipantCallback(participant: EditSessionParticipant) {
        dispatch(addEditSessionParticipantThunk(idCurrentEditSession, participant))
    }

    if (searchResults.isLoading) {
        return <CosmaeLoading />
    }
    const searchResultsValue = searchResults.value ?? []
    return (
        <ListGroup>
            {searchResultsValue.map((participant, idx) => (
                <EditSessionSearchResultEntry
                    key={idx}
                    participant={participant}
                    addParticipantCallback={addParticipantCallback}
                    currentSessionMemberIdMap={participantIds}
                    isAdding={
                        addingParticipant.isLoading &&
                        addingParticipant.value == participant.id
                    }
                />
            ))}
        </ListGroup>
    )
}

function EditSessionSearchResultEntry({
    participant,
    addParticipantCallback,
    currentSessionMemberIdMap,
    isAdding
}: {
    participant: EditSessionParticipant
    addParticipantCallback: (participant: EditSessionParticipant) => void
    currentSessionMemberIdMap: { [key: string]: boolean }
    isAdding: boolean
}) {
    return (
        <ListGroup.Item
            role="button"
            onClick={() => addParticipantCallback(participant)}
        >
            <Row>
                <Col>{participant.name}</Col>
                <Col xs="auto">
                    {isAdding ? (
                        <Spinner />
                    ) : (
                        currentSessionMemberIdMap[participant.id] && (
                            <span
                                className="icon text-primary"
                                data-testid="add-participant-success"
                            >
                                <CheckCircle />
                            </span>
                        )
                    )}
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

export function EditSessionOwnerList({ backCallback }: { backCallback: VoidFunction }) {
    const dispatch = useAppDispatch()
    useEffect(() => {
        dispatch(getEditSessionOwnerListThunk())
    })
    return (
        <Col className="d-flex flex-column h-100 ps-3 pe-3">
            <Row className="flex-grow-0 flex-shrink-0">
                Please select an edit session
            </Row>
            <Row className="flex-grow-1 flex-shrink-1 overflow-y-scroll scroll-gutter">
                <EditSessionOwnerListComponent backCallback={backCallback} />
            </Row>
            <Row className="flex-grow-0">
                <CreateEditSessionForm />
            </Row>
        </Col>
    )
}

export function EditSessionParticipantList() {
    const dispatch = useAppDispatch()
    useEffect(() => {
        dispatch(getEditSessionParticipantListThunk())
    })
    return (
        <Col className="d-flex flex-column h-100 ps-3 pe-3">
            <Row className="flex-grow-0 flex-shrink-0">
                You can remove yourself from edit sessions where you are a participant
            </Row>
            <Row className="flex-grow-1 flex-shrink-1 overflow-y-scroll scroll-gutter">
                <EditSessionParticipantListComponent />
            </Row>
        </Col>
    )
}

function EditSessionOwnerListComponent({
    backCallback
}: {
    backCallback: VoidFunction
}) {
    const editSessions = useAppSelector(selectEditSessionOwnerList)
    const idCurrentEditSession = useAppSelector(selectIdCurrentEditSessionPersistent)
    const dispatch = useAppDispatch()
    return (
        <ListGroup>
            {editSessions.value.map((session, idx) => (
                <ListGroup.Item
                    key={idx}
                    role="button"
                    onClick={() =>
                        dispatch(setCurrentEditSessionThunk(session.idPersistent)).then(
                            (result) => {
                                if (result) {
                                    backCallback()
                                }
                            }
                        )
                    }
                >
                    <Row className="justify-content-between">
                        <Col>{session.name}</Col>
                        <Col xs="auto" className="text-primary">
                            {idCurrentEditSession == session.idPersistent && (
                                <CheckCircle />
                            )}
                        </Col>
                    </Row>
                </ListGroup.Item>
            ))}
        </ListGroup>
    )
}

function RemoveSelfFromEditSessionDialog({
    session,
    closeDialogCallback
}: {
    session: EditSession
    closeDialogCallback: VoidFunction
}) {
    const userInfo = useAppSelector(selectUserInfo)
    const dispatch = useAppDispatch()
    const closeRow = (
        <Row>
            <Col xs="auto">
                <Button onClick={closeDialogCallback}>Cancel</Button>
            </Col>
        </Row>
    )
    const userInfoValue = userInfo.value
    if (userInfoValue === undefined) {
        return closeRow
    }
    return (
        <Col>
            <Row>
                Remove yourself from session with name {session.name}? This will remove
                your attribution past and future edits made by that session.
            </Row>
            <Row>
                <Col xs="auto">
                    <Button
                        onClick={() =>
                            dispatch(
                                removeEditSessionParticipantThunk(
                                    session.idPersistent,
                                    newEditSessionParticipant({
                                        id: userInfoValue.idPersistent,
                                        type: EditSessionParticipantType.internal,
                                        name: userInfoValue.username
                                    })
                                )
                            ).then((result) => {
                                if (result) {
                                    closeDialogCallback()
                                }
                            })
                        }
                        variant="outline-primary"
                    >
                        Remove
                    </Button>
                </Col>
            </Row>
            {closeRow}
        </Col>
    )
}

function EditSessionParticipantListComponent() {
    const editSessions = useAppSelector(selectEditSessionParticipantList)
    const [showRemove, setShowRemove] = useState<EditSession | undefined>(undefined)
    if (editSessions.isLoading) {
        return <CosmaeLoading />
    }
    if (showRemove !== undefined) {
        return (
            <RemoveSelfFromEditSessionDialog
                session={showRemove}
                closeDialogCallback={() => setShowRemove(undefined)}
            />
        )
    }
    if (editSessions.isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ListGroup>
            {editSessions.value.map((session, idx) => (
                <ListGroup.Item key={idx} role="button">
                    <Row>
                        <Col>{session.name}</Col>
                        <Col
                            xs="auto"
                            className="text-danger"
                            onClick={() => setShowRemove(session)}
                        >
                            <XCircle />
                        </Col>
                    </Row>
                </ListGroup.Item>
            ))}
        </ListGroup>
    )
}
