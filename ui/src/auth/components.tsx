import { ReactElement, ReactNode, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
    selectAuthStep,
    selectProviders,
    selectUserAuth,
    selectUserInfo
} from './selectors'
import { getConfigThunk, getSelfThunk, getSessionThunk, redirectThunk } from './thunks'
import { CosmaeLoading } from '../util/components/misc'
import { AuthStep } from './state'
import { useLocation, useNavigate } from 'react-router-dom'

export function AuthProvider(props: { children: ReactElement }) {
    const authUser = useAppSelector(selectUserAuth)
    const authStep = useAppSelector(selectAuthStep)
    const providers = useAppSelector(selectProviders)
    const userInfo = useAppSelector(selectUserInfo)
    const dispatch = useAppDispatch()
    const [redirectUrl, setRedirectUrl] = useState<string | undefined>(undefined)
    useEffect(() => {
        if (authUser === undefined && !authStep.isLoading) {
            switch (authStep.value) {
                case AuthStep.Initial:
                    dispatch(getSessionThunk(true))
                    break
                case AuthStep.Session:
                    dispatch(getConfigThunk())
                    break
                case AuthStep.Config:
                    if (providers?.length == 1) {
                        dispatch(redirectThunk(providers[0].id)).then((url) => {
                            if (url !== undefined) {
                                setRedirectUrl(url)
                            }
                        })
                    }
                    break
            }
        } else if (userInfo.value === undefined && !userInfo.isLoading) {
            dispatch(getSelfThunk())
        }
    })
    if (authStep.isLoading || userInfo.isLoading) {
        return <CosmaeLoading />
    }
    if (authStep.value === AuthStep.Redirect && redirectUrl !== undefined) {
        return <iframe src={redirectUrl} className="h-100" />
    }
    if (authUser === undefined && userInfo.value === undefined) {
        return <div>Not logged in</div>
    }
    return props.children ?? <div />
}

export function ProviderCallback() {
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    const error = params.get('error')
    const authStep = useAppSelector(selectAuthStep)
    const navigate = useNavigate()
    console.log(params)
    if (authStep.value === AuthStep.Authenticated) {
        navigate('/')
    } else {
        navigate('/')
    }
    return <div>Login Redirect Error</div>
}
