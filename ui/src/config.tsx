;async () => {
    try {
        const dotenv = await import('dotenv')
        dotenv.config()
    } catch (err) {
        console.log(err)
    }
}

export class CosmaeConf {
    private static instance?: CosmaeConf
    api_base: string
    private constructor({ api_base }: { api_base: string }) {
        this.api_base = api_base
    }

    static get() {
        if (CosmaeConf.instance === undefined || CosmaeConf.instance === null) {
            let api_path = process.env.COSMAE_API_PATH
            if (api_path === undefined || api_path == null) {
                api_path = '/api'
            }
            CosmaeConf.instance = new CosmaeConf({ api_base: api_path })
        }
        return CosmaeConf.instance
    }
}
