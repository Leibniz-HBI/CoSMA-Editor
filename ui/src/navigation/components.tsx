import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap'
import { NavLink, useNavigate } from 'react-router-dom'
import { HelpButton } from '../util/notification/components'
import { UserPermissionGroup } from '../user/state'
import { useAppDispatch, useAppSelector } from '../hooks'
import { PersonCircle } from 'react-bootstrap-icons'
import { logoutThunk } from '../auth/thunks'
import { selectUserInfo } from '../auth/selectors'

export function CosmaeNavbar() {
    return (
        <Navbar expand="lg" className="bg-primary flex-shrink-0 mb-3">
            <Container className="text-secondary">
                <Navbar.Brand href="/">Cosmae</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={NavLink} to="/">
                            View
                        </Nav.Link>
                        <Nav.Link as={NavLink} to="/contribute">
                            Contribute
                        </Nav.Link>
                        <Nav.Link as={NavLink} to="/review">
                            Review
                        </Nav.Link>
                        <Nav.Link as={NavLink} to="/tags">
                            Tags
                        </Nav.Link>
                    </Nav>
                    <Nav className="me-2">
                        <HelpButton />
                    </Nav>
                    <Nav>
                        <ProfileButton />
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    )
}
export function ProfileButton() {
    const dispatch = useAppDispatch()
    const userInfo = useAppSelector(selectUserInfo)
    const navigate = useNavigate()

    return (
        <NavDropdown
            title={
                <div className="rounded-circle" role="button">
                    <PersonCircle size={20} />
                </div>
            }
        >
            <NavDropdown.Item onClick={() => navigate('/profile')}>
                Profile
            </NavDropdown.Item>
            {userInfo.value?.permissionGroup == UserPermissionGroup.COMMISSIONER && (
                <NavDropdown.Item role="button" onClick={() => navigate('/management')}>
                    Manage
                </NavDropdown.Item>
            )}
            <NavDropdown.Divider />
            <NavDropdown.Item
                role="button"
                onClick={() => dispatch(logoutThunk()).then(() => location.reload())}
            >
                Logout
            </NavDropdown.Item>
        </NavDropdown>
    )
}
