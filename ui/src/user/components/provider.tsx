import { ReactElement, useEffect } from 'react'
import { useLogin } from '../hooks'
import { Modal } from 'react-bootstrap'
import { LoginForm } from './login_form'
import { RegistrationForm } from './registration_form'

export function LoginProvider({ body }: { body: ReactElement }) {
    const {
        userInfoWithCallbacks,
        showRegistration,
        loginErrorState,
        registrationErrorState,
        refreshCallback,
        loginCallback,
        clearLoginErrorCallback,
        registrationCallback,
        clearRegistrationErrorCallback,
        toggleRegistrationCallback
    } = useLogin()

    useEffect(() => {
        if (userInfoWithCallbacks?.userInfo === undefined) {
            refreshCallback()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfoWithCallbacks?.userInfo])
    if (userInfoWithCallbacks !== undefined) {
        return body
    }
    return (
        <div className="modal show" style={{ display: 'block', position: 'initial' }}>
            <Modal.Dialog>
                <Modal.Body>
                    {showRegistration ? (
                        <RegistrationForm
                            registrationCallback={registrationCallback}
                            closeRegistrationCallback={toggleRegistrationCallback}
                            registrationError={registrationErrorState}
                            clearRegistrationErrorCallback={
                                clearRegistrationErrorCallback
                            }
                        />
                    ) : (
                        <LoginForm
                            loginError={loginErrorState}
                            clearLoginErrorCallback={clearLoginErrorCallback}
                            loginCallback={loginCallback}
                            openRegistrationCallback={toggleRegistrationCallback}
                        />
                    )}
                </Modal.Body>
            </Modal.Dialog>
        </div>
    )
}
