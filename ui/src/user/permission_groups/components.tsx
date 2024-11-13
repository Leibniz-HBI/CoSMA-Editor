import { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useUserPermissionGroup } from './hooks'
import { CosmaeLoading } from '../../util/components/misc'
import { Col, FormCheck, ListGroup, Overlay, Row } from 'react-bootstrap'
import { PublicUserInfo, UserInfo, UserPermissionGroup } from '../state'
import { Remote } from '../../util/state'
import { debounce } from 'debounce'
import { AppDispatch } from '../../store'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FormField } from '../../util/form'
import { selectSearchResults } from '../selectors'
import { userSearch } from '../thunks'
import { userSearchClear } from '../slice'
export function UserPermissionGroupComponent() {
    const {
        userInfoList,
        selectedUser,
        getUserInfoListCallback,
        selectUserCallback,
        setUserPermissionCallback
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
            {userInfo.username}
        </ListGroup.Item>
    )
}

export function UserPermissionGroupForm({
    userInfo,
    setUserPermissionCallback
}: {
    userInfo: Remote<UserInfo | undefined>
    setUserPermissionCallback: (
        idUserPersistent: string,
        permission: UserPermissionGroup
    ) => void
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
                        {userInfo.value.username}
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
        </>
    )
}
const debouncedSearchDispatch = debounce(
    (searchTerm: string, dispatch: AppDispatch) => dispatch(userSearch(searchTerm)),
    400
)

const debouncedSearchDispatchThunk = (searchTerm: string) => (dispatch: AppDispatch) =>
    debouncedSearchDispatch(searchTerm, dispatch)

export function UserSearch({
    onSearchResultClicked,
    resultsClassName = ''
}: {
    onSearchResultClicked: (idUserPersistent: string) => void
    resultsClassName?: string
}) {
    const [searchString, setSearchString] = useState('')
    const dispatch = useAppDispatch()
    useEffect(() => {
        return () => {
            dispatch(userSearchClear())
        }
    })
    const target = useRef(null)

    return (
        <Col>
            <FormField
                label="Search User"
                name="search-user"
                value={searchString}
                handleChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const searchTerm = e.target.value
                    setSearchString(searchTerm)
                    if (searchTerm) {
                        debouncedSearchDispatchThunk(searchTerm)(dispatch)
                    } else {
                        dispatch(userSearchClear())
                    }
                }}
                ref={target}
            />
            <Overlay target={target} show={searchString != ''} placement="bottom-start">
                {({
                    placement: _placement,
                    arrowProps: _arrowProps,
                    show: _show,
                    popper: _popper,
                    hasDoneInitialMeasure: _hasDoneInitialMeasure,
                    ...props
                }) => {
                    return (
                        <Row
                            {...props}
                            style={{
                                position: 'relative',
                                paddingTop: '4px',
                                paddingLeft: '12px',
                                ...props.style,
                                zIndex: 9000
                            }}
                        >
                            <div className={resultsClassName}>
                                <div className="h-100 overflow-y-scroll scroll-gutter">
                                    <UserSearchResults
                                        onSearchResultClicked={(idUserPersistent) => {
                                            onSearchResultClicked(idUserPersistent)
                                            dispatch(userSearchClear())
                                            setSearchString('')
                                        }}
                                    />
                                </div>
                            </div>
                        </Row>
                    )
                }}
            </Overlay>
        </Col>
    )
}

export function UserSearchResults({
    onSearchResultClicked,
    className = ''
}: {
    onSearchResultClicked: (idEntityPersistent: string) => void
    className?: string
}) {
    const searchResults = useAppSelector(selectSearchResults)
    let items = [<ListGroup.Item key={-2}>No entities found</ListGroup.Item>]
    if (searchResults.value?.length > 0) {
        console.log(searchResults)
        items = searchResults?.value.map((result, idx) => (
            <UserSearchResultItem
                result={result}
                onSearchResultClicked={onSearchResultClicked}
                key={idx}
            />
        )) ?? [<ListGroup.Item key={-1} />]
    }
    return <ListGroup className={className}>{items}</ListGroup>
}

export function UserSearchResultItem({
    result,
    onSearchResultClicked
}: {
    result: PublicUserInfo
    onSearchResultClicked: (idUserPersistent: string) => void
}) {
    console.log(result.username)
    return (
        <ListGroup.Item
            className="z-toast fg-primary"
            onClick={() => onSearchResultClicked(result.idPersistent)}
        >
            <Row className="">{result.username}</Row>
        </ListGroup.Item>
    )
}
