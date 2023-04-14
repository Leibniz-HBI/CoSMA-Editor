import { Dispatch } from 'react'
import { ErrorState } from '../util/error'
import { exceptionMessage } from '../util/exception'
import { AsyncAction } from '../util/async_action'
import {
    ColumnSelectionAction,
    SetErrorAction,
    SetNavigationEntriesAction,
    StartLoadingAction,
    SubmitColumnDefinitionErrorAction,
    SubmitColumnDefinitionStartAction,
    SubmitColumnDefinitionSuccessAction
} from './actions'
import { ColumnDefinition, ColumnSelectionEntry, ColumnType } from './state'

export class GetHierarchyAction extends AsyncAction<ColumnSelectionAction, void> {
    apiPath: string
    idParentPersistent?: string
    expand: boolean
    indexPath: number[]
    namePath: string[]

    constructor({
        apiPath,
        idParentPersistent = undefined,
        expand = false,
        indexPath = [],
        namePath = []
    }: {
        apiPath: string
        idParentPersistent?: string
        expand?: boolean
        indexPath?: number[]
        namePath?: string[]
    }) {
        super()
        this.apiPath = apiPath
        this.idParentPersistent = idParentPersistent
        this.expand = expand
        this.indexPath = indexPath
        this.namePath = namePath
    }

    async run(dispatch: Dispatch<ColumnSelectionAction>) {
        dispatch(new StartLoadingAction(this.indexPath))
        const columnSelectionEntries: ColumnSelectionEntry[] = []
        try {
            const rsp = await fetch(this.apiPath + '/tags/definitions/children', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id_parent_persistent: this.idParentPersistent })
            })
            if (rsp.status != 200) {
                dispatch(
                    new SetErrorAction(
                        new ErrorState(
                            `Could not load column definitions. Reason: "${
                                (await rsp.json())['msg']
                            }"`,
                            () => this.run(dispatch)
                        )
                    )
                )
                return
            }
            const json = await rsp.json()
            const tagDefinitionsApi = await json['tag_definitions']
            for (const tagDefinitionApi of tagDefinitionsApi) {
                const columnType =
                    columnTypeMapApiToApp.get(tagDefinitionApi['type']) ??
                    ColumnType.String
                columnSelectionEntries.push(
                    new ColumnSelectionEntry({
                        columnDefinition: new ColumnDefinition({
                            idPersistent: tagDefinitionApi['id_persistent'],
                            idParentPersistent:
                                tagDefinitionApi['id_parent_persistent'],
                            namePath: [...this.namePath, tagDefinitionApi['name']],
                            version: tagDefinitionApi['version'],
                            columnType: columnType
                        }),
                        isExpanded: this.expand && columnType == ColumnType.Inner
                    })
                )
            }
            dispatch(
                new SetNavigationEntriesAction(columnSelectionEntries, this.indexPath)
            )
            const promises: Promise<void>[] = []
            columnSelectionEntries.forEach(
                async (entry: ColumnSelectionEntry, index: number) => {
                    if (entry.columnDefinition.columnType === ColumnType.Inner) {
                        promises.push(
                            new GetHierarchyAction({
                                ...this,
                                idParentPersistent: entry.columnDefinition.idPersistent,
                                indexPath: [...this.indexPath, index],
                                namePath: entry.columnDefinition.namePath,
                                expand: false
                            }).run(dispatch)
                        )
                    }
                }
            )
            await Promise.all(promises)

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            dispatch(
                new SetErrorAction(
                    new ErrorState(exceptionMessage(e), () => this.run(dispatch))
                )
            )
        }
    }
}

export class SubmitColumnDefinitionAction extends AsyncAction<
    ColumnSelectionAction,
    boolean
> {
    apiPath: string
    name: string
    idParentPersistent?: string
    columnTypeIdx: number

    constructor({
        apiPath,
        name,
        idParentPersistent,
        columnTypeIdx
    }: {
        apiPath: string
        name: string
        idParentPersistent?: string
        columnTypeIdx: number
    }) {
        super()
        this.apiPath = apiPath
        this.name = name
        this.idParentPersistent = idParentPersistent
        this.columnTypeIdx = columnTypeIdx
    }
    async run(dispatch: Dispatch<ColumnSelectionAction>): Promise<boolean> {
        dispatch(new SubmitColumnDefinitionStartAction())
        try {
            const rsp = await fetch(this.apiPath + '/tags/definitions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tag_definitions: [
                        {
                            name: this.name,
                            id_parent_persistent: this.idParentPersistent,
                            type: columnTypeIdxToApi[this.columnTypeIdx]
                        }
                    ]
                })
            })
            if (rsp.status == 200) {
                dispatch(new SubmitColumnDefinitionSuccessAction())
                return true
            }
            const msg = (await rsp.json())['msg']
            let retryCallback = undefined
            if (rsp.status >= 500) {
                retryCallback = () => this.run(dispatch)
            }

            dispatch(
                new SubmitColumnDefinitionErrorAction({
                    msg: msg,
                    retryCallback: retryCallback
                })
            )

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            dispatch(
                new SubmitColumnDefinitionErrorAction({
                    msg:
                        'Submitting the column definition failed: ' +
                        exceptionMessage(e),
                    retryCallback: () => this.run(dispatch)
                })
            )
        }
        return false
    }
}

const columnTypeMapApiToApp = new Map<string, ColumnType>([
    ['INNER', ColumnType.Inner],
    ['STRING', ColumnType.String],
    ['FLOAT', ColumnType.Float],
    ['BOOLEAN', ColumnType.Inner]
])

const columnTypeIdxToApi = ['STRING', 'FLOAT', 'INNER']
