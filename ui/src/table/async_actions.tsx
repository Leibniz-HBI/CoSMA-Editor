import { Dispatch } from "react"
import { exceptionMessage } from "../util/exception"
import { TableState } from "./state"
import { TableAction, SetLoadingAction, SetErrorAction, SetTableAction } from "./actions"
import { AsyncAction } from "../util/state"

/**
 * Async action for fetching table data.
 */
export class GetTableAsyncAction extends AsyncAction<TableState, TableAction> {
    apiPath: string
    constructor(apiPath: string) {
        super()
        this.apiPath = apiPath
    }
    async run(dispatch: Dispatch<TableAction>, state: TableState) {
        if (state.isLoading) {
            return
        }
        dispatch(new SetLoadingAction())
        try {

            const rsp = await fetch(this.apiPath + "/count")
            if (rsp.status !== 200) {
                dispatch(new SetErrorAction(
                    'Could not get number of table entries.' +
                    `Reason: "${(await rsp.json())['msg']}"`))
                return
            }
            const json = await rsp.json()
            const count = json["count"]
            let rows: any[] = []
            for (let i = 0; i < count; i += 100) {
                const rsp = await fetch(this.apiPath + "/chunk", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ "offset": i, "limit": 500 })
                },)
                if (rsp.status !== 200) {
                    dispatch(new SetErrorAction(
                        `Could not load chunk ${i}. Reason: "${(await rsp.json())['msg']}"`))
                    return
                }
                const rows_api = (await rsp.json())!['persons']
                for (let entry_json of rows_api) {
                    rows.push(entry_json)
                }
            }
            dispatch(new SetTableAction(rows))

        } catch (e: unknown) {
            dispatch(new SetErrorAction(exceptionMessage(e)))
        }
    }
}
