import { ReactElement, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import {
    selectAuthStepStack,
    selectUserAuth,
    selectUserInfo
} from '../selectors'
import {
    getSelfThunk,
    getSessionThunk,
    getTotpThunk,
    loginThunk,
} from '../thunks'
import { CosmaeLoading } from '../../util/components/misc'
import { AuthStep } from '../state'
import { LoginForm } from './login_form'
import { Modal } from 'react-bootstrap'
import { MfaForm } from './mfa_form'
import { ReauthenticationForm } from './reauthentication_form'
import { EmailVerificationNeeded } from './email_verification'

export function AuthProvider(props: { children: ReactElement }) {
    const stepStack = useAppSelector(selectAuthStepStack)
    const userInfo = useAppSelector(selectUserInfo)
    const dispatch = useAppDispatch()
    const authUser = useAppSelector(selectUserAuth)
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
            case AuthStep.ReauthenticationMfa:
                modalContent =<MfaForm reauthenticate={true}/>
                break
            case AuthStep.Totp:
                modalContent = <MfaForm reauthenticate={false}/>
                break
            case AuthStep.VerifyEmail:
                modalContent = <EmailVerificationNeeded />
                break
            default:
                modalContent = (
                    <LoginForm
                        loginCallback={(username, password) =>
                            dispatch(loginThunk(username, password))
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
    if (userInfo.value !== undefined) {
        return props.children ?? <div />
    }
}
