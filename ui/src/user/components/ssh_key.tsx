import { Button, Col, Form, ListGroup, Row } from 'react-bootstrap'
import { SshKey } from '../state'
import { Trash } from 'react-bootstrap-icons'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectSshKeyList } from '../selectors'
import { CosmaeLoading } from '../../util/components/misc'
import { ChangeEvent, useEffect, useState } from 'react'
import { deleteSshKeyThunk, getSshKeyListThunk, putSshKeyThunk } from '../thunks'
import { FormField } from '../../util/form'
import { addError } from '../../util/notification/slice'
import { clearSshKeyList } from '../slice'

export function SshKeyPage() {
    const dispatch = useAppDispatch()
    useEffect(() => {
        return () => {
            dispatch(clearSshKeyList())
        }
    })
    return (
        <Col className="d-flex flex-column overflow-hidden h-100 pb-3">
            <Row className="ms-1 me-1 flex-grow-0 flex-shrink-0">
                <SshKeyForm />
            </Row>
            <Row className="overflow-y-scroll ms-1 me-1 flex-grow-1">
                <SshKeyList />
            </Row>
        </Col>
    )
}

function SshKeyForm() {
    const [sshKeyString, setSshKeyString] = useState('')
    const dispatch = useAppDispatch()
    return (
        <Form onSubmit={() => dispatch(putSshKeyThunk(sshKeyString))}>
            <Row>
                <Col>
                    <FormField
                        label="SSH Key"
                        name="SSH Key"
                        value={sshKeyString}
                        handleChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setSshKeyString(e.target.value)
                        }
                    />
                </Col>
                <Col xs="auto" className="mt-2">
                    <Button type="submit">Add Key</Button>
                </Col>
            </Row>
        </Form>
    )
}

function SshKeyList() {
    const sshKeyList = useAppSelector(selectSshKeyList)
    const dispatch = useAppDispatch()
    function deleteCallback(idPersistent: string) {
        dispatch(deleteSshKeyThunk(idPersistent))
    }
    useEffect(() => {
        if (sshKeyList.isLoading || sshKeyList.value !== undefined) {
            return
        }
        dispatch(getSshKeyListThunk())
    })
    if (sshKeyList.isLoading || sshKeyList.value == undefined) {
        return <CosmaeLoading />
    }
    if (sshKeyList.value?.length == 0) {
        return <div>You have not added any SSH keys yet.</div>
    }
    return (
        <ListGroup>
            {sshKeyList.value.map((key: SshKey) => (
                <SshKeyItem
                    key={key.idPersistent}
                    sshKey={key}
                    deleteCallback={deleteCallback}
                />
            ))}
        </ListGroup>
    )
}

function SshKeyItem({
    sshKey,
    deleteCallback
}: {
    sshKey: SshKey
    deleteCallback: (idPersistent: string) => void
}) {
    return (
        <ListGroup.Item>
            <Row>
                <Col className="fw-bold">{sshKey.name}</Col>
                <Col className="fst-italic">
                    <span> type: </span>
                    <span>{sshKey.type}</span>
                </Col>
                <Col />
                <Col xs="auto">
                    <Button
                        variant="outline-danger"
                        onClick={() => deleteCallback(sshKey.idPersistent)}
                    >
                        <Trash />
                    </Button>
                </Col>
            </Row>
        </ListGroup.Item>
    )
}
