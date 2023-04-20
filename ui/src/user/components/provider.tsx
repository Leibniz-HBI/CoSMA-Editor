import { ReactElement, useLayoutEffect } from 'react'
import { UserContext, useLogin, HeaderProps } from '../hooks'
import { Col, Modal, Row } from 'react-bootstrap'
import { LoginForm } from './login_form'
import { RegistrationForm } from './registration_form'
import { UserInfo } from '../state'
export function LoginProvider({
    apiPath,
    header,
    body
}: {
    apiPath: string
    header: (props: HeaderProps) => ReactElement
    body: (userInfo: UserInfo) => ReactElement
}) {
    const {
        state,
        refreshCallback,
        loginCallback,
        clearLoginErrorCallback,
        registrationCallback,
        clearRegistrationErrorCallback,
        logoutCallback,
        toggleRegistrationCallback
    } = useLogin(apiPath)
    useLayoutEffect(() => {
        if (state.userInfo === undefined) {
            refreshCallback()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.userInfo])
    return (
        <UserContext.Provider value={state}>
            {header({
                logoutCallback:
                    state.userInfo === undefined ? undefined : logoutCallback
            })}
            {state.userInfo !== undefined ? (
                <Row className="flex-grow-1 m-4">
                    <Col>{body(state.userInfo)}</Col>
                </Row>
            ) : (
                <div
                    className="modal show"
                    style={{ display: 'block', position: 'initial' }}
                >
                    <Modal.Dialog>
                        <Modal.Body>
                            {state.showRegistration ? (
                                <RegistrationForm
                                    registrationCallback={registrationCallback}
                                    closeRegistrationCallback={
                                        toggleRegistrationCallback
                                    }
                                    registrationError={state.registrationErrorState}
                                    clearRegistrationErrorCallback={
                                        clearRegistrationErrorCallback
                                    }
                                />
                            ) : (
                                <LoginForm
                                    loginError={state.loginEerrorState}
                                    clearLoginErrorCallback={clearLoginErrorCallback}
                                    loginCallback={loginCallback}
                                    openRegistrationCallback={
                                        toggleRegistrationCallback
                                    }
                                />
                            )}
                        </Modal.Body>
                    </Modal.Dialog>
                </div>
            )}
        </UserContext.Provider>
    )
}
