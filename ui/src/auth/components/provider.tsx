import { ReactElement, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import {
    selectAuthStep,
    selectShowRegistrationValue,
    selectUserAuth,
    selectUserInfo
} from '../selectors'
import { getSelfThunk, getSessionThunk, loginThunk, registerThunk } from '../thunks'
import { CosmaeLoading } from '../../util/components/misc'
import { AuthStep } from '../state'
import { LoginForm } from './login_form'
import { toggleRegistration } from '../slice'
import { RegistrationForm } from './registration_form'
import { Modal } from 'react-bootstrap'

export function AuthProvider(props: { children: ReactElement }) {
    const authUser = useAppSelector(selectUserAuth)
    const authStep = useAppSelector(selectAuthStep)
    const userInfo = useAppSelector(selectUserInfo)
    const showRegistration = useAppSelector(selectShowRegistrationValue)
    const toggleRegistrationCallback = () =>
        dispatch(toggleRegistration(!showRegistration))
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (
            authStep.value !== AuthStep.LoggedOut &&
            authUser === undefined &&
            !authStep.isLoading
        ) {
            switch (authStep.value) {
                case AuthStep.Initial:
                    dispatch(getSessionThunk(true))
                    break
                case AuthStep.Session:
                    dispatch(getSelfThunk())
                    break
            }
        } else if (
            authStep.value === AuthStep.Authenticated &&
            userInfo.value === undefined &&
            !userInfo.isLoading
        ) {
            dispatch(getSelfThunk())
        }
    })
    if (authStep.isLoading || userInfo.isLoading) {
        return <CosmaeLoading />
    }
    if (authUser === undefined || userInfo.value === undefined) {
        let modalContent = (
            <LoginForm
                openRegistrationCallback={toggleRegistrationCallback}
                loginCallback={(username, password) =>
                    dispatch(loginThunk(username, password))
                }
            />
        )
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
    return props.children ?? <div />
}
