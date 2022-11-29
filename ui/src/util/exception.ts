export function exceptionMessage(e: unknown): string {
    if (typeof e === 'string') {
        return e.toUpperCase()
    } else if (e instanceof Error) {
        return e.message
    }
    return 'Unknown Error Occured'
}
