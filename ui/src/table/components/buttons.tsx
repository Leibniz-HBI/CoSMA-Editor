import { Badge, Button } from 'react-bootstrap'
import { AppDispatch } from '../../store'
import { showEntityAdd, toggleSearch } from '../slice'

import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import { putEntityMergeRequest } from '../../merge_request/entity/conflicts/thunks'
import { selectPermissionGroup } from '../../auth/selectors'
import { UserPermissionGroup } from '../../user/state'
import { ColumnState, csvLinesFromTable, FilterClause } from '../state'
import { Entity } from '../../entity/state'
import { toggleRowSelection } from '../selection/slice'
import { selectRowSelectionOrder } from '../selection/selectors'
import { downloadWorkAround } from './table'
import { useColumnDefinitionList } from '../../column_menu/hooks'
import { useAppSelector } from '../../hooks'
import { RemoteInterface } from '../../util/state'

export function AddEntityButton({
    dispatch,
    disabled
}: {
    dispatch: AppDispatch
    disabled: boolean
}) {
    return (
        <Button onClick={() => dispatch(showEntityAdd())} disabled={disabled}>
            Add Entity
        </Button>
    )
}
export function MergeEntitiesButton({
    entityIdArray,
    mergeRequestCreatedCallback,
    disabled
}: {
    entityIdArray: RemoteInterface<Entity | undefined>[]
    mergeRequestCreatedCallback: VoidFunction
    disabled: boolean
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
    let canNotMerge = true
    let onClick = undefined

    if (!disabled && rowSelectionOrder.length == 2) {
        canNotMerge = false
        const src = entityIdArray.at(rowSelectionOrder[0])?.value
        const dst = entityIdArray.at(rowSelectionOrder[1])?.value
        onClick = () => {
            if (src !== undefined && dst !== undefined) {
                dispatch(putEntityMergeRequest(src?.idPersistent, dst?.idPersistent))
            }
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
                <Button disabled={canNotMerge} onClick={onClick}>
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
    showJustifications,
    upUntilTime
}: {
    entities: RemoteInterface<Entity | undefined>[]
    columnStates: ColumnState[]
    showJustifications: boolean
    upUntilTime: Date | undefined
}) {
    const columnList = useColumnDefinitionList(
        columnStates.map((columnState) => columnState.idColumnPersistent),
        upUntilTime
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

export function FilterButton({
    onClick,
    filter
}: {
    onClick: () => void
    filter: FilterClause | undefined
}) {
    let content = <span>Filter</span>
    if (filter !== undefined) {
        content = (
            <>
                Filter
                <Badge
                    bg="warning"
                    className="position-absolute top-0 start-100 translate-middle p-2 rounded-circle"
                >
                    <span className="visually-hidden">Active Filter</span>
                </Badge>
            </>
        )
    }
    return (
        <Button className="position-relative" onClick={onClick}>
            {content}
        </Button>
    )
}
