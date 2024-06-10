import { useEffect } from 'react'
import { Form } from 'react-bootstrap'
import { TagDefinition } from '../state'
import { TagCreateForm, ColumnTypeCreateFormProps } from './form'
import { ColumnSelector, EditModal } from './selection'
import { Eye, EyeFill } from 'react-bootstrap-icons'
import { useDispatch, useSelector } from 'react-redux'
import { selectTagSelectionLoading } from '../selectors'
import { loadTagDefinitionHierarchy } from '../thunks'
import { AppDispatch } from '../../store'
import { TabView } from '../../util/components/tabs'
import { useAppSelector } from '../../hooks'

export function ColumnMenu(props: {
    columnIndices: { [key: string]: number }
    loadColumnDataCallback: (columnDefinition: TagDefinition) => void
    hideColumnDataCallback: (columnDefinition: TagDefinition) => void
}) {
    const isLoading = useSelector(selectTagSelectionLoading)
    const dispatch: AppDispatch = useDispatch()
    useEffect(
        () => {
            if (!isLoading) {
                dispatch(loadTagDefinitionHierarchy({ expand: true }))
            }
        },
        //eslint-disable-next-line
        [dispatch]
    )
    return (
        <ColumnMenuBody
            columnIndices={props.columnIndices}
            loadColumnDataCallback={props.loadColumnDataCallback}
            hideColumnDataCallback={props.hideColumnDataCallback}
        />
    )
}

export function ColumnMenuBody({
    columnIndices,
    loadColumnDataCallback,
    hideColumnDataCallback
}: {
    columnIndices: { [key: string]: number }
    loadColumnDataCallback: (columnDefinition: TagDefinition) => void
    hideColumnDataCallback: (columnDefinition: TagDefinition) => void
}) {
    const isLoading = useAppSelector(selectTagSelectionLoading)

    return (
        <>
            <TabView
                isLoading={isLoading}
                tabList={[
                    {
                        name: 'Load',
                        component: (
                            <ShowTabBody
                                columnIndices={columnIndices}
                                loadColumnDataCallback={loadColumnDataCallback}
                                hideColumnDataCallback={hideColumnDataCallback}
                            />
                        )
                    },
                    {
                        name: 'Create',
                        component: (
                            <CreateTabBody
                                additionalEntries={[
                                    { idPersistent: '', name: 'No parent' }
                                ]}
                            />
                        )
                    }
                ]}
            />
            <EditModal />
        </>
    )
}
export function CreateTabBody({
    additionalEntries = [],
    existingTagDefinition
}: {
    additionalEntries?: { idPersistent: string; name: string }[]
    existingTagDefinition?: TagDefinition
}) {
    return (
        <div className="ps-3 pe-3 d-flex flex-column overflow-hidden flex-grow-1 flex-shrink-1 h-100">
            <TagCreateForm existingTagDefinition={existingTagDefinition}>
                {(columnTypeCreateFormProps: ColumnTypeCreateFormProps) => (
                    <ColumnSelector
                        allowEdit={false}
                        additionalEntries={additionalEntries}
                        mkTailElement={(columnDefinition: TagDefinition) => (
                            <Form.Check
                                type="radio"
                                name="parent"
                                value={columnDefinition.idPersistent}
                                onChange={(_event) =>
                                    columnTypeCreateFormProps.setParent(
                                        columnDefinition.idPersistent,
                                        columnDefinition.namePath
                                    )
                                }
                                checked={
                                    columnTypeCreateFormProps.selectedParent ==
                                    columnDefinition.idPersistent
                                }
                            />
                        )}
                    />
                )}
            </TagCreateForm>
        </div>
    )
}

function ShowTabBody({
    columnIndices,
    loadColumnDataCallback,
    hideColumnDataCallback
}: {
    columnIndices: { [key: string]: number }
    loadColumnDataCallback: (columnDefinition: TagDefinition) => void
    hideColumnDataCallback: (columnDefinition: TagDefinition) => void
}) {
    return (
        <div className="ps-2 pe-2 d-flex flex-column overflow-hidden flex-grow-1 flex-shrink-1 h-100">
            <ColumnSelector
                mkTailElement={(columnDefinition: TagDefinition) => {
                    const isDisplayedInTable =
                        columnIndices[columnDefinition.idPersistent] !== undefined
                    if (isDisplayedInTable) {
                        return (
                            <span
                                className="icon"
                                onClick={() => hideColumnDataCallback(columnDefinition)}
                            >
                                <EyeFill height={20} />
                            </span>
                        )
                    } else {
                        return (
                            <span
                                className="icon"
                                onClick={() => loadColumnDataCallback(columnDefinition)}
                            >
                                <Eye height={20} />
                            </span>
                        )
                    }
                }}
            />
        </div>
    )
}
