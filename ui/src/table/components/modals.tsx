import { Modal } from 'react-bootstrap'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { EntityMergeRequestConflictComponent } from '../../merge_request/entity/conflicts/components'
import {
    selectEntityAddState,
    selectShowColumnMenu,
    selectShowEntityAddMenu,
    selectShowEntityMerging
} from '../selectors'
import {
    hideColumnAddMenu,
    hideEntityAdd,
    removeColumnByIdPersistent,
    toggleEntityMergingModal
} from '../slice'
import { entityChangeOrCreate, getColumnAsync, getTableAsync } from '../thunks'
import { AddEntityForm } from '../../entity/components'
import { ColumnMenu } from '../../column_menu/components/menu'
import { TagDefinition } from '../../column_menu/state'
import {
    remoteUserProfileColumnAppend,
    remoteUserProfileColumnDeleteAsync
} from '../../user/thunks'

export function EntityMergingModal() {
    const dispatch = useAppDispatch()
    const showEntityMergingModal = useAppSelector(selectShowEntityMerging)
    return (
        <Modal
            show={showEntityMergingModal}
            onHide={() => dispatch(toggleEntityMergingModal(false))}
            size="xl"
            // fullscreen={true}
            key="entity-merging-modal"
        >
            <Modal.Header closeButton={true}>
                <Modal.Title>Merge Entities</Modal.Title>
            </Modal.Header>
            <Modal.Body className="display-block vh-95">
                <EntityMergeRequestConflictComponent
                    loadDataCallback={() => dispatch(getTableAsync())}
                />
            </Modal.Body>
        </Modal>
    )
}
export function EntityAddModal() {
    const dispatch = useAppDispatch()
    const showEntityAddMenu = useAppSelector(selectShowEntityAddMenu)
    const entityAddState = useAppSelector(selectEntityAddState)
    return (
        <Modal
            show={showEntityAddMenu}
            onHide={() => dispatch(hideEntityAdd())}
            size="xl"
            key="entity-add-modal"
        >
            <Modal.Header closeButton={true}>
                <Modal.Title>Add new Entity</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <AddEntityForm
                    state={entityAddState}
                    addEntityCallback={(displayTxt) =>
                        dispatch(entityChangeOrCreate({ displayTxt }))
                    }
                />
            </Modal.Body>
        </Modal>
    )
}

export function ColumnModal({
    columnIndices
}: {
    columnIndices: { [key: string]: number }
}) {
    const dispatch = useAppDispatch()
    const showColumnMenu = useAppSelector(selectShowColumnMenu)
    return (
        <Modal
            show={showColumnMenu}
            onHide={() => dispatch(hideColumnAddMenu())}
            size="xl"
            key="column-menu-modal"
            className="h-100"
        >
            <Modal.Header closeButton>
                <Modal.Title className="text-dark">
                    Show Additional Tag Values
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-secondary vh-85">
                <ColumnMenu
                    columnIndices={columnIndices}
                    loadColumnDataCallback={(columnDefinition: TagDefinition) =>
                        dispatch(getColumnAsync(columnDefinition)).then(() =>
                            dispatch(
                                remoteUserProfileColumnAppend(
                                    columnDefinition.idPersistent
                                )
                            )
                        )
                    }
                    hideColumnDataCallback={(columnDefinition: TagDefinition) =>
                        dispatch(
                            remoteUserProfileColumnDeleteAsync(
                                columnDefinition.idPersistent
                            )
                        ).then(() =>
                            dispatch(
                                removeColumnByIdPersistent(
                                    columnDefinition.idPersistent
                                )
                            )
                        )
                    }
                />
            </Modal.Body>
        </Modal>
    )
}
