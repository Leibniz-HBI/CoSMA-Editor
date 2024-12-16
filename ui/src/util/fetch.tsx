import { JsonValue } from './type'

export async function fetch_chunk({
    api_path,
    offset,
    limit,
    payload = {},
    fetchMethod = fetch
}: {
    api_path: string
    offset: number
    limit: number
    payload?: { [key: string]: JsonValue }
    fetchMethod?: (
        input: RequestInfo | URL,
        init?: RequestInit | undefined
    ) => Promise<Response>
}) {
    return await fetchMethod(api_path, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...payload, offset: offset, limit: limit })
    })
}

export async function fetch_chunk_get({
    api_path,
    offset,
    limit,
    fetchMethod = fetch
}: {
    api_path: string
    offset: number
    limit: number
    fetchMethod?: (
        input: RequestInfo | URL,
        init?: RequestInit | undefined
    ) => Promise<Response>
}) {
    return await fetchMethod(
        api_path + '/' + offset.toString() + '/' + limit.toString(),
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Access-Control-Allow-Credentials': 'true'
            }
        }
    )
}

export const ACCEPT_JSON_HEADER = {
    accept: 'application/json'
}
