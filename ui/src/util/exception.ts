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
    detail: { loc: string[]; msg: string; type: string; ctx: JsonValue }[]
}

export function unprocessableEntityMessage(json: UnprocessableEntity): string {
    const errorDetailList = json.detail
    const errorMessageList = errorDetailList.map(
        (error) => `Error for field ${error.loc[error.loc.length - 1]}: ${error.msg}.`
    )
    return errorMessageList.join('\n')
}
