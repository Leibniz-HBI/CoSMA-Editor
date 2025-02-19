/*global location*/
/*eslint no-restricted-globals: 0*/
import './App.css'
import '@glideapps/glide-data-grid/dist/index.css'
import './App.scss'
import { Col, Container, Nav, Navbar, Row } from 'react-bootstrap'
import { RemoteDataTable } from './table/components/table'
import {
    NavLink,
    Outlet,
    RouterProvider,
    createBrowserRouter,
    redirect
} from 'react-router-dom'
import { ContributionList, ContributionStepper } from './contribution/components'
import { config } from './config'
import { ContributionStep } from './contribution/state'
import { exceptionMessage } from './util/exception'
import { ReviewList } from './merge_request/components'
import { MergeRequestConflictView } from './merge_request/conflicts/components'
import { UserPermissionGroup } from './user/state'
import {
    HelpButton,
    HelpModal,
    NotificationToastList
} from './util/notification/components'
import { Provider, useDispatch, useSelector } from 'react-redux'
import store, { AppDispatch } from './store'
import { selectUserInfo } from './auth/selectors'
import { TagManagementPage } from './tag_management/components'
import { EntityMergeRequestConflictView } from './merge_request/entity/conflicts/components'
import { ManagementPage } from './management/components'
import { contributionStepApiToUiMap } from './contribution/thunks'
import { AuthProvider } from './auth/components/provider'
import { addError } from './util/notification/slice'

export function CosmaeRoot() {
    const userInfo = useSelector(selectUserInfo)
    const dispatch: AppDispatch = useDispatch()
    return (
        <>
            <Row className="m-0 h-100">
                <Col className="ps-0 pe-0 h-100">
                    <div className="cosmae-page-container">
                        <Navbar expand="lg" className="bg-primary flex-shrink-0 mb-3">
                            <Container className="text-secondary">
                                <Navbar.Brand href="/">CoSMA-E</Navbar.Brand>
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
                                        {userInfo.value?.permissionGroup ==
                                            UserPermissionGroup.COMMISSIONER && (
                                            <Nav.Link as={NavLink} to="/management">
                                                Manage
                                            </Nav.Link>
                                        )}
                                    </Nav>
                                    <Nav>
                                        <Nav.Link
                                            onClick={
                                                () =>
                                                    dispatch(
                                                        addError(
                                                            'Logout not yet implemented.'
                                                        )
                                                    )
                                                // .then(()=>location.reload())
                                            }
                                        >
                                            Logout
                                        </Nav.Link>
                                    </Nav>
                                </Navbar.Collapse>
                            </Container>
                        </Navbar>
                        <div className="d-contents">
                            <Outlet />
                        </div>
                    </div>
                </Col>
            </Row>
            <HelpModal />
        </>
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
                element: <ContributionStepper selectedIdx={0} />,
                loader: ({ params }) => params.idPersistent ?? ''
            },
            {
                path: 'contribute/:idPersistent/columns',
                element: <ContributionStepper selectedIdx={1} />,
                loader: ({ params }) => params.idPersistent ?? ''
            },
            {
                path: 'contribute/:idPersistent/entities',
                element: <ContributionStepper selectedIdx={2} />,
                loader: ({ params }) => params.idPersistent ?? ''
            },
            {
                path: 'contribute/:idPersistent/complete',
                element: <ContributionStepper selectedIdx={3} />,
                loader: ({ params }) => params.idPersistent ?? ''
            },
            {
                path: 'review',
                element: <ReviewList />
            },
            {
                path: 'review/tags/:idPersistent',
                element: <MergeRequestConflictView />,
                loader: ({ params }) => params.idPersistent ?? ''
            },
            {
                path: 'review/entities/:idPersistent',
                element: <EntityMergeRequestConflictView />,
                loader: ({ params }) => params.idPersistent ?? ''
            },
            {
                path: 'tags',
                element: <TagManagementPage />
            },
            {
                path: 'management/',
                element: <ManagementPage />,
                loader: ({ params }) => params.category ?? ''
            },
            {
                path: 'management/:category',
                element: <ManagementPage />,
                loader: ({ params }) => params.category ?? ''
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
        <Provider store={store}>
            <Container
                fluid
                className="vh-100 d-flex flex-column ps-0 pe-0 ms-0 me-0 cosmae-container"
            >
                {/* <LoginProvider body={<RouterProvider router={router} />} /> */}
                <AuthProvider>
                    <RouterProvider router={router} />
                </AuthProvider>
            </Container>
            <NotificationToastList />
        </Provider>
    )
}
export default App
function TableConnector() {
    return <RemoteDataTable />
}
