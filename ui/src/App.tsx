import './App.css'
import '@glideapps/glide-data-grid/dist/index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { LoginProvider } from './user/components/provider'
import { config } from './config'
import { HeaderProps } from './user/hooks'
import { Button, Col, Container, Row } from 'react-bootstrap'
import { RemoteDataTable } from './table/components'
import { UserInfo } from './user/state'

function CosmaeHeader({ headerProps }: { headerProps: HeaderProps }) {
    return (
        <Row className="cosmae-header justify-content-between ms-0 me-0 ">
            <Col></Col>
            <Col md="auto">CoSMA-E</Col>
            <Col>
                {headerProps.logoutCallback && (
                    <Button variant="link" onClick={headerProps.logoutCallback}>
                        Logout
                    </Button>
                )}
            </Col>
        </Row>
    )
}

function App() {
    return (
        <Container
            fluid
            className=" min-vh-100 d-flex flex-column ps-0 pe-0 cosmae-container"
        >
            <LoginProvider
                apiPath={config.api_path}
                header={(headerProps) => <CosmaeHeader headerProps={headerProps} />}
                body={(userInfo: UserInfo) => (
                    <RemoteDataTable
                        base_url={config.api_path}
                        column_defs={userInfo.columns}
                    />
                )}
            />
        </Container>
    )
}

export default App
