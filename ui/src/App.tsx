import './App.css'
import '@glideapps/glide-data-grid/dist/index.css'
import './App.scss'
import { LoginProvider } from './user/components/provider'
import { Col, Container, Nav, Navbar, Row } from 'react-bootstrap'
import { RemoteDataTable } from './table/components'
import { UserContext } from './user/hooks'
import {
    NavLink,
    Outlet,
    RouterProvider,
    createBrowserRouter,
    redirect
} from 'react-router-dom'
import { ContributionList } from './contribution/components'
import { ContributionDetailsStep } from './contribution/details/components'
import { ColumnDefinitionStep } from './contribution/columns/components'
import { config } from './config'
import { contributionStepApiToUiMap } from './contribution/async_actions'
import { ContributionStep } from './contribution/state'
import { exceptionMessage } from './util/exception'
import { EntitiesStep } from './contribution/entity/components'
import { ReviewList } from './merge_request/components'
import { CompleteStep } from './contribution/complete/components'
import { MergeRequestConflictResolutionView } from './merge_request/conflicts/components'

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
                                    <Nav.Link as={NavLink} to="/review">
                                        Review
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
                path: 'contribute/:idPersistent',
                loader: async ({ params }) => {
                    return await redirectContributionStep(params.idPersistent)
                }
            },
            {
                path: 'contribute/:idPersistent/metadata',
                element: <ContributionDetailsStep />,
                loader: ({ params }) => params.idPersistent
            },
            {
                path: 'contribute/:idPersistent/columns',
                element: <ColumnDefinitionStep />,
                loader: ({ params }) => params.idPersistent
            },
            {
                path: 'contribute/:idPersistent/entities',
                element: <EntitiesStep />,
                loader: ({ params }) => params.idPersistent
            },
            {
                path: 'contribute/:idPersistent/complete',
                element: <CompleteStep />,
                loader: ({ params }) => params.idPersistent
            },
            {
                path: 'review',
                element: <ReviewList />
            },
            {
                path: 'review/:idPersistent',
                element: <MergeRequestConflictResolutionView />,
                loader: ({ params }) => params.idPersistent
            }
        ]
    }
])

async function redirectContributionStep(idPersistent: string | undefined) {
    if (idPersistent === undefined) {
        throw new Response('no contribution id specified', { status: 400 })
    }
    try {
        const rsp = await fetch(config.api_path + '/contributions/' + idPersistent, {
            credentials: 'include'
        })
        const json = await rsp.json()
        const step = contributionStepApiToUiMap[json['state']]
        if (step == ContributionStep.ColumnsExtracted) {
            return redirect(`/contribute/${idPersistent}/columns`)
        }
        if (step == ContributionStep.ValuesExtracted) {
            return redirect(`/contribute/${idPersistent}/entities`)
        }
        if (step == ContributionStep.EntitiesAssigned) {
            return redirect(`/contribute/${idPersistent}/complete`)
        }
        return redirect(`/contribute/${idPersistent}/metadata`)
    } catch (e: unknown) {
        throw new Response(exceptionMessage(e), { status: 500 })
    }
}

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
