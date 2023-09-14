import { JsonValue } from './type'

export function exceptionMessage(e: unknown): string {
    if (typeof e === 'string') {
        return e.toUpperCase()
    } else if (e instanceof Error) {
        return e.message
    }
    return 'Unknown Error Occured'
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
    return 'Unknown API error'
}
