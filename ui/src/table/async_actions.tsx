import { Dispatch } from 'react'
import { exceptionMessage } from '../util/exception'
import {
    TableAction,
    SetEntityLoadingAction,
    SetLoadDataErrorAction,
    SetEntitiesAction,
    AppendColumnAction,
    SetColumnLoadingAction,
    Edit,
    SubmitValuesStartAction,
    SubmitValuesEndAction,
    SubmitValuesErrorAction
} from './actions'
import { AsyncAction } from '../util/async_action'
import { fetch_chunk } from '../util/fetch'
import { ColumnDefinition, ColumnType } from '../column_menu/state'
import { CellValue } from './state'
import { config } from '../config'

const displayTxtColumnId = 'display_txt_id'
/**
 * Async action for fetching table data.
 */
export class GetTableAsyncAction extends AsyncAction<TableAction, void> {
    async run(dispatch: Dispatch<TableAction>) {
        dispatch(new SetEntityLoadingAction())
        dispatch(
            new SetColumnLoadingAction(
                'Display Text',
                displayTxtColumnId,
                ColumnType.String
            )
        )
        try {
            const entities: string[] = []
            const displayTxts: { [key: string]: CellValue[] } = {}
            for (let i = 0; ; i += 500) {
                const rsp = await fetch_chunk({
                    api_path: config.api_path + '/persons/chunk',
                    offset: i,
                    limit: 500
                })
                if (rsp.status == 404) {
                    new SetEntitiesAction([])
                    return
                } else if (rsp.status !== 200) {
                    dispatch(
                        new SetLoadDataErrorAction(
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
                        displayTxts[idPersistent] = [
                            {
                                value: entry_json['display_txt'],
                                idPersistent: idPersistent,
                                version: Number.parseInt(entry_json['version'])
                            }
                        ]
                    }
                }
                if (rowsApi.length < 500) {
                    break
                }
            }
            dispatch(new SetEntitiesAction(entities))
            dispatch(new AppendColumnAction(displayTxtColumnId, displayTxts))
        } catch (e: unknown) {
            dispatch(new SetLoadDataErrorAction(exceptionMessage(e)))
        }
    }
}

export class GetColumnAsyncAction extends AsyncAction<TableAction, void> {
    columnDefinition: ColumnDefinition

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(column_definition: ColumnDefinition) {
        super()
        this.columnDefinition = column_definition
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async run(dispatch: Dispatch<TableAction>) {
        const id_persistent = this.columnDefinition.idPersistent
        const columnType = this.columnDefinition.columnType
        try {
            const name = this.columnDefinition.namePath.join('->')
            dispatch(new SetColumnLoadingAction(name, id_persistent, columnType))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const column_data: { [key: string]: CellValue[] } = {}
            for (let i = 0; ; i += 5000) {
                const rsp = await fetch_chunk({
                    api_path: config.api_path + '/tags/chunk',
                    offset: i,
                    limit: 5000,
                    payload: {
                        id_tag_definition_persistent: id_persistent
                    }
                })
                if (rsp.status !== 200) {
                    dispatch(
                        new SetLoadDataErrorAction(
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
                    const valueString = tag['value']
                    const valueIdPersistent = tag['id_persistent']
                    const valueVersion = Number.parseInt(tag['version'])
                    const parsedValue = parseValue(
                        this.columnDefinition.columnType,
                        valueString
                    )
                    const versionedValue = {
                        value: parsedValue,
                        idPersistent: valueIdPersistent,
                        version: valueVersion
                    }
                    if (id_entity_persistent in column_data) {
                        const cell = column_data[id_entity_persistent]
                        cell.push(versionedValue)
                    } else {
                        column_data[id_entity_persistent] = [versionedValue]
                    }
                }
                if (tags.length < 5000) {
                    break
                }
            }
            dispatch(new AppendColumnAction(id_persistent, column_data))
        } catch (e: unknown) {
            dispatch(new SetLoadDataErrorAction(exceptionMessage(e)))
        }
    }
}

export class SubmitValuesAsyncAction extends AsyncAction<TableAction, void> {
    edit: Edit
    columnType: ColumnType

    constructor(columnType: ColumnType, edit: Edit) {
        super()
        this.columnType = columnType
        this.edit = edit
    }
    async run(dispatch: Dispatch<TableAction>) {
        dispatch(new SubmitValuesStartAction())
        try {
            const rsp = await fetch(config.api_path + '/tags', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tag_instances: [
                        {
                            id_entity_persistent: this.edit[0],
                            id_tag_definition_persistent: this.edit[1],
                            value: this.edit[2].value,
                            id_persistent: this.edit[2].idPersistent,
                            version: this.edit[2].version
                        }
                    ]
                })
            })
            if (rsp.status == 200) {
                const tagInstance = (await rsp.json())['tag_instances'][0]

                dispatch(new SubmitValuesEndAction([this.extractEdit(tagInstance)]))
                return
            }
            if (rsp.status == 409) {
                const tagInstance = (await rsp.json())['tag_instances'][0]
                dispatch(new SubmitValuesEndAction([this.extractEdit(tagInstance)]))
                dispatch(
                    new SubmitValuesErrorAction(
                        'The data you entered changed in the remote location. ' +
                            'The new values are updated in the table. Please review them.'
                    )
                )
                return
            }
            const msg = (await rsp.json())['msg']
            let retryCallback = undefined
            if (rsp.status >= 500) {
                retryCallback = () => this.run(dispatch)
            }
            dispatch(new SubmitValuesErrorAction(msg, retryCallback))
        } catch (e: unknown) {
            dispatch(
                new SubmitValuesErrorAction('Unknown error: ' + exceptionMessage(e))
            )
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extractEdit(tagInstance: { [key: string]: any }): Edit {
        return [
            this.edit[0],
            this.edit[1],
            {
                value: parseValue(this.columnType, tagInstance['value']),
                version: tagInstance['version'],
                idPersistent: tagInstance['id_persistent']
            }
        ]
    }
}

export function parseValue(
    columnType: ColumnType,
    valueString: string
): number | boolean | string | undefined {
    try {
        if (columnType === ColumnType.Float) {
            return Number.parseFloat(valueString)
        }
        if (columnType === ColumnType.Inner) {
            return valueString.toLowerCase() == 'true'
        }
        return valueString
    } catch (e: unknown) {
        return undefined
    }
}
