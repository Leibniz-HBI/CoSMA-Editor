import './App.css'
import '@glideapps/glide-data-grid/dist/index.css'
import './App.scss'
import { LoginProvider } from './user/components/provider'
import { Col, Container, Nav, Navbar, Row } from 'react-bootstrap'
import { RemoteDataTable } from './table/components'
import { UserContext } from './user/hooks'
import { NavLink, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { ContributionList } from './contribution/components'
import { ContributionDetailsStep } from './contribution/details/components'

export function CosmaeRoot() {
    return (
        <Row className="flex-grow-1 m-0 h-100">
            <Col className="ps-0 pe-0 h-100">
                <div className="cosmae-page-container">
                    <Navbar expand="lg" className="bg-primary flex-shrink-0 mb-3">
                        <Container className="text-secondary">
                            <Navbar.Brand href="#home">CoSMA-E</Navbar.Brand>
                            <Navbar.Toggle aria-controls="basic-navbar-nav" />
                            <Navbar.Collapse id="basic-navbar-nav">
                                <Nav className="me-auto">
                                    <Nav.Link as={NavLink} to="/">
                                        View
                                    </Nav.Link>
                                    <Nav.Link as={NavLink} to="/contribute">
                                        Contribute
                                    </Nav.Link>
                                </Nav>
                            </Navbar.Collapse>
                        </Container>
                    </Navbar>
                    <div className="cosmae-page-body flex-grow-1 flex-basis-0 flex-fill">
                        <Outlet />
                    </div>
                </div>
            </Col>
        </Row>
    )
}

const router = createBrowserRouter([
    {
        path: '/',
        element: <CosmaeRoot />,
        children: [
            { path: '', element: <TableConnector />, index: true },
            {
                path: 'contribute',
                element: <ContributionList />
            },
            {
                path: 'contribute/:idpersistent',
                element: <ContributionDetailsStep />,
                loader: ({ params }) => {
                    return params.idpersistent
                }
            }
        ]
    }
])

function App() {
    return (
        <Container
            fluid
            className="vh-100 d-flex flex-column ps-0 pe-0 ms-0 me-0 cosmae-container"
        >
            <LoginProvider body={<RouterProvider router={router} />} />
        </Container>
    )
}
export default App
function TableConnector() {
    return (
        <UserContext.Consumer>
            {(userInfoWithLogout) =>
                userInfoWithLogout && (
                    <RemoteDataTable
                        column_defs={userInfoWithLogout.userInfo.columns}
                    />
                )
            }
        </UserContext.Consumer>
    )
}
