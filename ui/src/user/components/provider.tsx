import { ReactElement, useLayoutEffect } from 'react'
import { UserContext, useLogin } from '../hooks'
import { Modal } from 'react-bootstrap'
import { LoginForm } from './login_form'
import { RegistrationForm } from './registration_form'

export function LoginProvider({ body }: { body: ReactElement }) {
    const {
        userInfoWithLogout,
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

    useLayoutEffect(() => {
        if (userInfoWithLogout === undefined) {
            refreshCallback()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfoWithLogout?.userInfo])
    return (
        <UserContext.Provider value={userInfoWithLogout}>
            {userInfoWithLogout !== undefined ? (
                body
            ) : (
                <div
                    className="modal show"
                    style={{ display: 'block', position: 'initial' }}
                >
                    <Modal.Dialog>
                        <Modal.Body>
                            {showRegistration ? (
                                <RegistrationForm
                                    registrationCallback={registrationCallback}
                                    closeRegistrationCallback={
                                        toggleRegistrationCallback
                                    }
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
