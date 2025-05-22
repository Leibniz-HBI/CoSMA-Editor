import { Button } from 'react-bootstrap'
import { AppDispatch } from '../../store'
import { showEntityAdd, toggleSearch } from '../slice'

import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import { putEntityMergeRequest } from '../../merge_request/entity/conflicts/thunks'
import { selectPermissionGroup } from '../../auth/selectors'
import { UserPermissionGroup } from '../../user/state'
import { ColumnState, csvLinesFromTable } from '../state'
import { Entity } from '../../entity/state'
import { toggleRowSelection } from '../selection/slice'
import { selectRowSelectionOrder } from '../selection/selectors'
import { downloadWorkAround } from './table'
import { useColumnDefinitionList } from '../../column_menu/hooks'
import { useAppSelector } from '../../hooks'

export function AddEntityButton({ dispatch }: { dispatch: AppDispatch }) {
    return <Button onClick={() => dispatch(showEntityAdd())}>Add Entity</Button>
}
export function MergeEntitiesButton({
    entityIdArray,
    mergeRequestCreatedCallback
}: {
    entityIdArray?: Entity[]
    mergeRequestCreatedCallback: VoidFunction
}) {
    const rowSelectionOrder = useSelector(selectRowSelectionOrder)
    const permissionGroup = useSelector(selectPermissionGroup)
    const dispatch: AppDispatch = useDispatch()
    if (
        entityIdArray === undefined ||
        (permissionGroup !== UserPermissionGroup.EDITOR &&
            permissionGroup !== UserPermissionGroup.COMMISSIONER)
    ) {
        return <div />
    }
    let disabled = true
    let onClick = undefined

    if (rowSelectionOrder.length == 2) {
        disabled = false
        onClick = () => {
            dispatch(
                putEntityMergeRequest(
                    entityIdArray[rowSelectionOrder[0]].idPersistent,
                    entityIdArray[rowSelectionOrder[1]].idPersistent
                )
            )
            mergeRequestCreatedCallback()
            dispatch(toggleRowSelection(rowSelectionOrder))
        }
    }
    return (
        <OverlayTrigger
            placement="right"
            delay={{ show: 250, hide: 400 }}
            overlay={
                <Tooltip id="button-tooltip-2">
                    Select exactly two rows to allow entity merging.
                </Tooltip>
            }
        >
            {/* Empty div to allow tooltip showing   */}
            <span>
                <Button disabled={disabled} onClick={onClick}>
                    Merge Entities
                </Button>
            </span>
        </OverlayTrigger>
    )
}
export function SearchButton({ dispatch }: { dispatch: AppDispatch }) {
    return <Button onClick={() => dispatch(toggleSearch(true))}>Search</Button>
}
export function DownloadButton({
    entities,
    columnStates,
    showJustifications
}: {
    entities: Entity[] | undefined
    columnStates: ColumnState[]
    showJustifications: boolean
}) {
    const columnList = useColumnDefinitionList(
        columnStates.map((columnState) => columnState.idColumnPersistent)
    )
    const selectedRows = useAppSelector(selectRowSelectionOrder)
    return (
        <Button
            onClick={() =>
                downloadWorkAround(
                    csvLinesFromTable({
                        entities,
                        selectedRows,
                        columns: columnList,
                        columnStates,
                        showJustifications
                    })
                )
            }
        >
            Download
        </Button>
    )
}
