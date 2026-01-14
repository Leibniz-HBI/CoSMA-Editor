import { AppDispatch } from '../store'
import { addError } from './notification/slice'
import {
    authStepEnd,
    setReauthenticateMfa,
    setReauthenticate,
    setPartiallyAuthenticated,
    setVerifyEmail,
    logoutSuccess,
    setPasswordChange
} from '../auth/slice'

export function handleAllauthResponse(
    dispatch: AppDispatch,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    successAction: (dispatch: AppDispatch, json: any) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: { [key: string]: any } | undefined
) {
    if(json === undefined){
        return
    }
    const status = json['status'] ?? json['response']['status']
    const data = json['data']
    if (status == 200) {
        successAction(dispatch, data)
        return
    }
    const errors: { [key: string]: string }[] = json['errors'] ?? json['error']['errors']
    if (errors !== undefined && errors.length > 0) {
        for (const error of errors) {
            dispatch(addError(error['message']))
        }
        dispatch(authStepEnd())
    }
    if (data === undefined) {
        return
    }
    const meta = json['meta']
    const flowList = data['flows']
    const availableFlows = new Set<string>()
    const pendingFlows = new Set<string>()
    for (const flow of flowList) {
        const flowId = flow['id']
        if (flow['is_pending']) {
            pendingFlows.add(flowId)
        }
        availableFlows.add(flowId)
    }
    if (status == 401) {
        const isAuthenticated = meta['is_authenticated']
        if (isAuthenticated) {
            if (availableFlows.has('mfa_reauthenticate')) {
                dispatch(setReauthenticateMfa())
            } else if (availableFlows.has('reauthenticate')) {
                dispatch(setReauthenticate())
            } else if (pendingFlows.has('password_change')) {
                dispatch(setPasswordChange())
            }
        } else if (pendingFlows.has('mfa_authenticate')) {
            dispatch(setPartiallyAuthenticated(false))
        } else if (pendingFlows.has('mfa_register')) {
            dispatch(setPartiallyAuthenticated(true))
        } else if (pendingFlows.has('verify_email')) {
            dispatch(setVerifyEmail())
        } else {
            dispatch(logoutSuccess())
        }
    }
}

export function handleAllauthResponseFromClient(
    dispatch: AppDispatch,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    successAction: (dispatch: AppDispatch, json: any) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: { [key: string]: any } | undefined
) {
    if(json === undefined){
        return
    }
    const data = json['data']
    if (data !== undefined) {
        successAction(dispatch, data['data'])
        return
    }
    const errorData = json['error']
    const errors: { [key: string]: string }[] = errorData['errors']
    if (errors !== undefined && errors.length > 0) {
        for (const error of errors) {
            dispatch(addError(error['message']))
        }
        dispatch(authStepEnd())
    }
    if (errorData === undefined) {
        return
    }
    const meta = errorData['meta']
    const flowList = errorData['data']?.['flows'] ?? []
    const status = errorData['status']
    const availableFlows = new Set<string>()
    const pendingFlows = new Set<string>()
    for (const flow of flowList) {
        const flowId = flow['id']
        if (flow['is_pending']) {
            pendingFlows.add(flowId)
        }
        availableFlows.add(flowId)
    }
    if (status == 401) {
        const isAuthenticated = meta['is_authenticated']
        if (isAuthenticated) {
            if (availableFlows.has('mfa_reauthenticate')) {
                dispatch(setReauthenticateMfa())
            } else if (availableFlows.has('reauthenticate')) {
                dispatch(setReauthenticate())
            } else if (pendingFlows.has('password_change')) {
                dispatch(setPasswordChange())
            }
        } else if (pendingFlows.has('mfa_authenticate')) {
            dispatch(setPartiallyAuthenticated(false))
        } else if (pendingFlows.has('mfa_register')) {
            dispatch(setPartiallyAuthenticated(true))
        } else if (pendingFlows.has('verify_email')) {
            dispatch(setVerifyEmail())
        } else {
            dispatch(logoutSuccess())
        }
    }
}
