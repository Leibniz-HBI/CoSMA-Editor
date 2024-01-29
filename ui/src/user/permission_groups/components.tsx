import { useLayoutEffect } from 'react'
import { useUserPermissionGroup } from './hooks'
import { CosmaeLoading } from '../../util/components/misc'
import { Alert, Col, FormCheck, ListGroup, Row } from 'react-bootstrap'
import { UserInfo, UserPermissionGroup } from '../state'
import { Remote } from '../../util/state'
export function UserPermissionGroupComponent() {
    const {
        userInfoList,
        selectedUser,
        getUserInfoListCallback,
        selectUserCallback,
        setUserPermissionCallback,
        setUserPermissionClearErrorCallback
    } = useUserPermissionGroup()
    useLayoutEffect(
        () => {
            getUserInfoListCallback()
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )
    if (userInfoList.isLoading) {
        return <CosmaeLoading />
    }
    return (
        <Row className="h-100">
            <Col className="h-100" xs={6}>
                <ListGroup>
                    {userInfoList.value.map((userInfo) => (
                        <UserInfoListItem
                            userInfo={userInfo}
                            active={
                                userInfo.idPersistent ==
                                selectedUser.value?.idPersistent
                            }
                            selectUserCallback={selectUserCallback}
                            key={userInfo.idPersistent}
                        />
                    ))}
                </ListGroup>
            </Col>
            <Col>
                <UserPermissionGroupForm
                    userInfo={selectedUser}
                    setUserPermissionCallback={setUserPermissionCallback}
                    clearErrorCallback={setUserPermissionClearErrorCallback}
                />
            </Col>
        </Row>
    )
}
export function UserInfoListItem({
    userInfo,
    active,
    selectUserCallback
}: {
    userInfo: UserInfo
    active: boolean
    selectUserCallback: (userInfo: UserInfo) => void
}): JSX.Element {
    return (
        <ListGroup.Item
            active={active}
            onClick={() => selectUserCallback(userInfo)}
            role="button"
        >
            {userInfo.userName}
        </ListGroup.Item>
    )
}

export function UserPermissionGroupForm({
    userInfo,
    setUserPermissionCallback,
    clearErrorCallback
}: {
    userInfo: Remote<UserInfo | undefined>
    setUserPermissionCallback: (
        idUserPersistent: string,
        permission: UserPermissionGroup
    ) => void
    clearErrorCallback: VoidFunction
}) {
    if (userInfo.value === undefined) {
        return <span>Please select a user.</span>
    }
    return (
        <>
            <Row className="mb-3">
                <Col>
                    <span key="description">Change permissions for user: </span>
                    <span className="fw-bold" key="user-name">
                        {userInfo.value.userName}
                    </span>
                </Col>
            </Row>
            <Row className="ms-3">
                {[
                    UserPermissionGroup.APPLICANT,
                    UserPermissionGroup.READER,
                    UserPermissionGroup.CONTRIBUTOR,
                    UserPermissionGroup.EDITOR,
                    UserPermissionGroup.COMMISSIONER
                ].map((permission) => (
                    <FormCheck
                        checked={userInfo.value?.permissionGroup == permission}
                        value={permission}
                        onChange={(_event) => {
                            if (userInfo.value == undefined) {
                                return
                            }
                            setUserPermissionCallback(
                                userInfo.value.idPersistent,
                                permission
                            )
                        }}
                        label={permission.toString()}
                        type="radio"
                        name="user-permission"
                        disabled={userInfo.isLoading}
                        key={permission}
                    />
                ))}
            </Row>
            {userInfo.errorMsg !== undefined && (
                <Alert
                    variant="danger"
                    dismissible
                    onClose={clearErrorCallback}
                    closeVariant="white"
                >
                    <Alert.Heading>Error</Alert.Heading>
                    {userInfo.errorMsg}
                </Alert>
            )}
        </>
    )
}
