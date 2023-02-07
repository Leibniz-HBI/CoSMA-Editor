import { JsonValue } from './type'

export async function fetch_chunk({
    api_path,
    offset,
    limit,
    payload = {}
}: {
    api_path: string
    offset: number
    limit: number
    payload?: { [key: string]: JsonValue }
}) {
    return await fetch(api_path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...payload, offset: offset, limit: limit })
    })
}
