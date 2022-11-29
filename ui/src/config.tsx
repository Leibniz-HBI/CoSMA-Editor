
export class CosmaeConf {
    private static instance?: CosmaeConf
    api_base: string
    private constructor({ api_base }: { api_base: string }) {
        this.api_base = api_base
    }

    static get() {
        if (CosmaeConf.instance === undefined || CosmaeConf.instance === null) {
            let base_url = process.env.COSMAE_HOST
            if (base_url === undefined || base_url == null) {
                base_url = "http://127.0.0.1:8000"
            }
            CosmaeConf.instance = new CosmaeConf({ api_base: base_url + "/cosmae/api" })
        }
        return CosmaeConf.instance

    }
}
