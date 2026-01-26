/*global location*/
/*eslint no-restricted-globals: 0*/
import './App.css'
import '@glideapps/glide-data-grid/dist/index.css'
import './App.scss'
import { Col, Container, Row } from 'react-bootstrap'
import { RemoteDataTable } from './table/components/table'
import { Outlet, RouterProvider, createBrowserRouter, redirect } from 'react-router-dom'
import { ContributionList, ContributionStepper } from './contribution/components'
import { ContributionStep } from './contribution/state'
import { exceptionMessage } from './util/exception'
import { ReviewList } from './merge_request/components'
import { MergeRequestConflictView } from './merge_request/conflicts/components'
import { HelpModal, NotificationToastList } from './util/notification/components'
import { Provider } from 'react-redux'
import store from './store'
import { ColumnManagementPage } from './column_management/components'
import { EntityMergeRequestConflictView } from './merge_request/entity/conflicts/components'
import { ManagementPage } from './management/components'
import { contributionStepApiToUiMap } from './contribution/thunks'
import { AuthProvider } from './auth/components/provider'
import { EmailVerification } from './auth/components/email_verification'
import { CosmaeNavbar } from './navigation/components'
import { ProfilePage } from './user/components/profile'
import { cosmaeContributionApiContributionGet } from './openapi/cosmae'
import { ResultsLink } from './management/data_publication/components'

export function CosmaeRoot() {
    return (
        <AuthProvider>
            <>
                <Row className="m-0 h-100">
                    <Col className="ps-0 pe-0 h-100">
                        <div className="cosmae-page-container">
                            <CosmaeNavbar />
                            <div className="d-contents">
                                <Outlet />
                            </div>
                        </div>
                    </Col>
                </Row>
                <HelpModal />
            </>
        </AuthProvider>
    )
}

const router = createBrowserRouter([
    {
        path: '/account/verify-email',
        element: <Outlet />,
        children: [
            {
                path: ':key',
                loader: ({ params }) => params.key ?? '',
                element: <EmailVerification />
            }
        ]
    },
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
                path: 'review/columns/:idPersistent',
                element: <MergeRequestConflictView />,
                loader: ({ params }) => params.idPersistent ?? ''
            },
            {
                path: 'review/entities/:idPersistent',
                element: <EntityMergeRequestConflictView />,
                loader: ({ params }) => params.idPersistent ?? ''
            },
            {
                path: 'columns',
                element: <ColumnManagementPage />
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
            },
            {
                path: 'profile/',
                element: <ProfilePage />,
                loader: ({ params }) => params.category ?? ''
            },
            {
                path: 'profile/:category',
                element: <ProfilePage />,
                loader: ({ params }) => params.category ?? ''
            },
            {
                path: 'data_publication/:idPersistent',
                element: <ResultsLink />,
                loader: ({ params }) => params.idPersistent ?? ''
            }
        ]
    }
])

async function redirectContributionStep(idPersistent: string | undefined) {
    if (idPersistent === undefined) {
        throw new Response('no contribution id specified', { status: 400 })
    }
    try {
        const rsp = await cosmaeContributionApiContributionGet({
            path: { id_persistent: idPersistent }
        })
        if (rsp.error) {
            throw new Error(`error loading contribution: ${rsp.error.msg}`)
        }

        const step = contributionStepApiToUiMap[rsp.data.state]
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
                <RouterProvider router={router} />
            </Container>
            <NotificationToastList />
        </Provider>
    )
}
export default App
function TableConnector() {
    return <RemoteDataTable />
}
