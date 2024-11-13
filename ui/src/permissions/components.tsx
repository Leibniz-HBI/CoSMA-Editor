import { Col, FormCheck, ListGroup, Placeholder, Row } from 'react-bootstrap'
import { usePermissionListForResource } from './hooks'
import { CosmaeLoading } from '../util/components/misc'
import { newUserPermissionSet, PermissionSet, UserPermissionSet } from './state'
import { ChangeEvent } from 'react'
import { useAppDispatch } from '../hooks'
import { setPermissionThunk } from './thunks'
import { UserSearch } from '../user/permission_groups/components'
import { useUserInfo } from '../user/hooks'

type ChangePermissionCallback = (userPermissionSet: UserPermissionSet) => void

export function PermissionManager({
    idResourcePersistent
}: {
    idResourcePersistent: string
}) {
    const permissionList = usePermissionListForResource(idResourcePersistent)
    const dispatch = useAppDispatch()
    if (permissionList.isLoading || permissionList === undefined) {
        return <CosmaeLoading />
    }
    const changePermissionCallback = (userPermissionSet: UserPermissionSet) =>
        dispatch(
            setPermissionThunk({
                ...userPermissionSet,
                idResourcePersistent: idResourcePersistent
            })
        )
    return (
        <Col className="d-contents">
            <Row className="w-400px ms-4 me-4 align-content-end" key="user-search">
                <Col>
                    <UserSearch
                        onSearchResultClicked={(idUserPersistent) =>
                            changePermissionCallback(
                                newUserPermissionSet({
                                    idUserPersistent,
                                    read: true,
                                    write: false
                                })
                            )
                        }
                    />
                </Col>
            </Row>
            <Row className="h-100 overflow-hidden ms-4 me-4 mb-4" key="permission-list">
                <Col className="h-100 overflow-y-scroll scroll-gutter">
                    <ListGroup>
                        {permissionList.value?.map((userPermissionSet) => (
                            <PermissionEntry
                                userPermissionSet={userPermissionSet}
                                changePermissionCallback={changePermissionCallback}
                                key={userPermissionSet.idUserPersistent}
                            />
                        ))}
                    </ListGroup>
                </Col>
            </Row>
        </Col>
    )
}

function PermissionEntry({
    userPermissionSet,
    changePermissionCallback
}: {
    userPermissionSet: UserPermissionSet
    changePermissionCallback: ChangePermissionCallback
}) {
    const user = useUserInfo(userPermissionSet.idUserPersistent)
    if (user.value === undefined) {
        return (
            <ListGroup.Item key={userPermissionSet.idUserPersistent}>
                <Placeholder>{userPermissionSet.idUserPersistent}</Placeholder>
            </ListGroup.Item>
        )
    }
    return (
        <ListGroup.Item key={userPermissionSet.idUserPersistent}>
            <Row>
                <Col key="user-label">{user.value.username}</Col>
                <Col xs="auto" key="checkboxes">
                    <Row>
                        <Col xs="auto" key="read">
                            <PermissionCheckBox
                                permission={userPermissionSet}
                                permissionKey="read"
                                changePermissionCallback={changePermissionCallback}
                            />
                        </Col>
                        <Col xs="auto" key="write">
                            <PermissionCheckBox
                                permission={userPermissionSet}
                                permissionKey="write"
                                changePermissionCallback={changePermissionCallback}
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

function PermissionCheckBox({
    permission,
    permissionKey,
    changePermissionCallback
}: {
    permission: UserPermissionSet
    permissionKey: keyof PermissionSet
    changePermissionCallback: ChangePermissionCallback
}) {
    return (
        <FormCheck
            label={permissionKey}
            type="checkbox"
            checked={permission[permissionKey]}
            onChange={(_e: ChangeEvent<HTMLInputElement>) =>
                changePermissionCallback({
                    ...permission,
                    [permissionKey]: !permission[permissionKey]
                })
            }
        />
    )
}
