import {createClient} from '@hey-api/openapi-ts'

createClient({
        input: './openapi/allauth_openapi.yaml',
    output: 'src/openapi/allauth'
})
createClient({
        input: './openapi/openapi.json',
    output: 'src/openapi/cosmae'
})
