import { Dispatch } from 'react'
import { exceptionMessage } from '../util/exception'
import { TableState } from './state'
import {
    TableAction,
    SetEntityLoadingAction,
    SetErrorAction,
    SetEntitiesAction,
    AppendColumnAction,
    SetColumnLoadingAction
} from './actions'
import { AsyncAction } from '../util/state'
import { fetch_chunk } from '../util/fetch'
import { ColumnDefinition, ColumnType } from '../column_menu/state'

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
        if (state.entities.length > 0 || state.isLoading || state.isLoadingColumn()) {
            return
        }
        dispatch(new SetEntityLoadingAction())
        dispatch(
            new SetColumnLoadingAction(
                'Display Text',
                'display_txt_id',
                ColumnType.String
            )
        )
        try {
            const entities: string[] = []
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const displayTxts: { [key: string]: any } = {}
            for (let i = 0; ; i += 500) {
                const rsp = await fetch_chunk({
                    api_path: this.apiPath + '/persons/chunk',
                    offset: i,
                    limit: 500
                })
                if (rsp.status !== 200) {
                    dispatch(
                        new SetErrorAction(
                            `Could not load entities chunk ${i}. Reason: "${
                                (await rsp.json())['msg']
                            }"`
                        )
                    )
                    return
                }
                const json = await rsp.json()
                const rowsApi = json['persons']
                if (rowsApi !== null) {
                    for (const entry_json of rowsApi) {
                        const idPersistent = entry_json['id_persistent']
                        entities.push(idPersistent)
                        displayTxts[idPersistent] = {
                            values: [entry_json['display_txt']]
                        }
                    }
                }
                if (rowsApi.length < 500) {
                    break
                }
            }
            dispatch(new SetEntitiesAction(entities))
            dispatch(new AppendColumnAction('display_txt_id', displayTxts))
        } catch (e: unknown) {
            dispatch(new SetErrorAction(exceptionMessage(e)))
        }
    }
}

export class GetColumnAsyncAction extends AsyncAction<TableState, TableAction> {
    apiPath: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columnDefinition: ColumnDefinition

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(api_path: string, column_definition: ColumnDefinition) {
        super()
        this.apiPath = api_path
        this.columnDefinition = column_definition
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async run(dispatch: Dispatch<TableAction>, state: TableState) {
        const id_persistent = this.columnDefinition.idPersistent
        const columnType = this.columnDefinition.columnType
        if (
            state.isLoading ||
            (state.columnIndices.has(id_persistent) &&
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                state.columnStates[state.columnIndices.get(id_persistent)!].isLoading)
        ) {
            return
        }
        try {
            const name = this.columnDefinition.namePath.join('->')
            dispatch(new SetColumnLoadingAction(name, id_persistent, columnType))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const column_data: { [key: string]: any } = {}
            for (let i = 0; ; i += 5000) {
                const rsp = await fetch_chunk({
                    api_path: this.apiPath + '/tags/chunk',
                    offset: i,
                    limit: 5000,
                    payload: {
                        id_tag_definition_persistent: id_persistent
                    }
                })
                if (rsp.status !== 200) {
                    dispatch(
                        new SetErrorAction(
                            `Could not load entities chunk ${i}. Reason: "${
                                (await rsp.json())['msg']
                            }"`
                        )
                    )
                    return
                }
                const json = await rsp.json()
                const tags = json['tag_instances']
                for (const tag of tags) {
                    const id_entity_persistent: string = tag['id_entity_persistent']
                    const value = tag['value']
                    if (id_entity_persistent in column_data) {
                        const cell = column_data[id_entity_persistent]
                        cell['values'].add(value)
                    } else {
                        column_data[id_entity_persistent] = {
                            values: [value]
                        }
                    }
                }
                if (tags.length < 5000) {
                    break
                }
            }
            dispatch(new AppendColumnAction(id_persistent, column_data))
        } catch (e: unknown) {
            dispatch(new SetErrorAction(exceptionMessage(e)))
        }
    }
}
