import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import { selectRowSelectionOrder } from './selectors'
import { AppDispatch } from '../../store'
import { toggleRowSelection } from './slice'
import { selectPermissionGroup } from '../../user/selectors'
import { UserPermissionGroup } from '../../user/state'
import { Entity } from '../state'
import { putEntityMergeRequest } from '../../merge_request/entity/conflicts/thunks'

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
