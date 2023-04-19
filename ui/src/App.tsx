import './App.css'
import { PersonTable } from './person_natural/components'
import '@glideapps/glide-data-grid/dist/index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { LoginProvider } from './user/components/provider'
import { config } from './config'
import { HeaderProps } from './user/hooks'
import { Button, Col, Container, Row } from 'react-bootstrap'

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
                body={() => <PersonTable api_base={config.api_path} />}
            />
        </Container>
    )
}

export default App
