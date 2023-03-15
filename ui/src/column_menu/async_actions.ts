import { Dispatch } from 'react'
import { ErrorState } from '../util/error'
import { exceptionMessage } from '../util/exception'
import { AsyncAction } from '../util/state'
import {
    ColumnSelectionAction,
    SetErrorAction,
    SetNavigationEntriesAction,
    StartLoadingAction
} from './actions'
import {
    ColumnDefinition,
    ColumnSelectionEntry,
    ColumnSelectionState,
    ColumnType
} from './state'

export class GetHierarchyAction extends AsyncAction<
    ColumnSelectionState,
    ColumnSelectionAction
> {
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

    async run(dispatch: Dispatch<ColumnSelectionAction>, state: ColumnSelectionState) {
        if (state.isLoading) {
            return
        }
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
                        new ErrorState({
                            msg: `Could not load column definitions. Reason: "${
                                (await rsp.json())['msg']
                            }"`,
                            retryCallback: () => this.run(dispatch, state)
                        })
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
                            }).run(dispatch, state)
                        )
                    }
                }
            )
            await Promise.all(promises)

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            dispatch(
                new SetErrorAction(
                    new ErrorState({
                        msg: exceptionMessage(e),
                        retryCallback: () => this.run(dispatch, state)
                    })
                )
            )
        }
    }
}

const columnTypeMapApiToApp = new Map<string, ColumnType>([
    ['INNER', ColumnType.Inner],
    ['STRING', ColumnType.String],
    ['FLOAT', ColumnType.Float],
    ['BOOLEAN', ColumnType.Inner]
])
