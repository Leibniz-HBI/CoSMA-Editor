import { ReactElement, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import {
    selectAuthStepStack,
    selectShowRegistrationValue,
    selectUserAuth,
    selectUserInfo
} from '../selectors'
import {
    getSelfThunk,
    getSessionThunk,
    getTotpThunk,
    loginThunk,
    registerThunk
} from '../thunks'
import { CosmaeLoading } from '../../util/components/misc'
import { AuthStep } from '../state'
import { LoginForm } from './login_form'
import { toggleRegistration } from '../slice'
import { RegistrationForm } from './registration_form'
import { Modal } from 'react-bootstrap'
import { MfaForm } from './mfa_form'
import { ReauthenticationForm } from './reauthentication_form'

export function AuthProvider(props: { children: ReactElement }) {
    const authUser = useAppSelector(selectUserAuth)
    const stepStack = useAppSelector(selectAuthStepStack)
    const userInfo = useAppSelector(selectUserInfo)
    const showRegistration = useAppSelector(selectShowRegistrationValue)
    const toggleRegistrationCallback = () =>
        dispatch(toggleRegistration(!showRegistration))
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (stepStack.isLoading || userInfo.isLoading) {
            return
        }
        switch (stepStack.value.at(-1)) {
            case undefined:
                dispatch(getSessionThunk(true))
                break
            case AuthStep.PartiallyAuthenticated:
                dispatch(getTotpThunk())
                break
            case AuthStep.Authenticated:
                if (userInfo.value === undefined) {
                    dispatch(getSelfThunk())
                }
                break
        }
    })
    const currentAuthStep = stepStack.value.at(-1)
    if (stepStack.isLoading || userInfo.isLoading || currentAuthStep === undefined) {
        return <CosmaeLoading />
    }
    if (authUser === undefined) {
        let modalContent = <div>Could not authenticate. Please refresh the page.</div>
        switch (currentAuthStep) {
            case AuthStep.Reauthentication:
                modalContent = <ReauthenticationForm />
                break
            case AuthStep.Totp:
                modalContent = <MfaForm />
                break
            default:
                if (showRegistration) {
                    modalContent = (
                        <RegistrationForm
                            closeRegistrationCallback={toggleRegistrationCallback}
                            registrationCallback={({
                                username,
                                namesPersonal,
                                namesFamily,
                                email,
                                password
                            }) =>
                                dispatch(
                                    registerThunk({
                                        username,
                                        namesPersonal,
                                        namesFamily,
                                        email,
                                        password
                                    })
                                )
                            }
                        />
                    )
                } else {
                    modalContent = (
                        <LoginForm
                            openRegistrationCallback={toggleRegistrationCallback}
                            loginCallback={(username, password) =>
                                dispatch(loginThunk(username, password))
                            }
                        />
                    )
                }
        }
        return (
            <div
                className="modal show"
                style={{ display: 'block', position: 'initial' }}
            >
                <Modal.Dialog>
                    <Modal.Body>{modalContent}</Modal.Body>
                </Modal.Dialog>
            </div>
        )
    }
    if (userInfo.value !== undefined) {
        return props.children ?? <div />
    }
}
