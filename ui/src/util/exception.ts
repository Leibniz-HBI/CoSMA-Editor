import { AxiosError } from 'axios'
import { JsonValue } from './type'

export function exceptionMessage(e: unknown): string {
    if (typeof e === 'string') {
        return e.toUpperCase()
    }
    if (e instanceof AxiosError) {
        if (e.response) {
            return errorMessageFromApi(e.response.data)
        }
        if (e.request) {
            const request = e.request
            let path = ''
            let method = ''
            if (request instanceof XMLHttpRequest) {
                path = request.responseURL
                method = 'reach'
            } else {
                path = request.path
                method = request.method
            }
            return `Could not ${method} ${path}`
        }
    }
    if (e instanceof Error) {
        return e.message
    }
    return 'Unknown Error Occurred'
}

export type UnprocessableEntity = {
    loc: string[]
    msg: string
    type: string
    ctx: JsonValue
}[]

export function unprocessableEntityMessage(
    errorDetailList: UnprocessableEntity
): string {
    const errorMessageList = errorDetailList.map(
        (error) => `Error for field ${error.loc[error.loc.length - 1]}: ${error.msg}.`
    )
    return errorMessageList.join('\n')
}

export function errorMessageFromApi(json: { [key: string]: unknown }): string {
    const msg = json['msg']
    if (msg !== null && msg !== undefined) {
        return msg as string
    }
    const detail = json['detail']
    if (detail !== null && detail !== undefined) {
        if (typeof detail === 'string') {
            return detail as string
        }
        return unprocessableEntityMessage(detail as UnprocessableEntity)
    }
    const error = json['error'] as { [key: string]: unknown }
    if (error !== undefined && error !== null) {
        const msg = error['message']
        if (msg !== undefined) {
            return msg as string
        }
    }
    return 'Unknown API error'
}
