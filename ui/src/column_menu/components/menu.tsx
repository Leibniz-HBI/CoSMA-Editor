import { useEffect } from 'react'
import { Form } from 'react-bootstrap'
import { Column } from '../state'
import { ColumnCreateForm, ColumnTypeCreateFormProps } from './form'
import { ColumnSelector, EditModal } from './selection'
import { Eye, EyeFill } from 'react-bootstrap-icons'
import { useDispatch, useSelector } from 'react-redux'
import { selectColumnSelectionLoading } from '../selectors'
import { loadColumnHierarchy } from '../thunks'
import { AppDispatch } from '../../store'
import { TabView } from '../../util/components/tabs'
import { useAppSelector } from '../../hooks'

export function ColumnMenu({
    columnIndices,
    additionalEntries = [],
    additionalIndices = {},
    loadColumnDataCallback,
    hideColumnDataCallback
}: {
    columnIndices: { [key: string]: number }
    additionalEntries?: { idPersistent: string; name: string }[]
    additionalIndices?: { [key: string]: number }
    loadColumnDataCallback: (columnDefinition: Column) => void
    hideColumnDataCallback: (columnDefinition: Column) => void
}) {
    const isLoading = useSelector(selectColumnSelectionLoading)
    const dispatch: AppDispatch = useDispatch()
    useEffect(
        () => {
            if (!isLoading) {
                dispatch(loadColumnHierarchy({ expand: true }))
            }
        },
        //eslint-disable-next-line
        [dispatch]
    )
    return (
        <ColumnMenuBody
            columnIndices={columnIndices}
            loadColumnDataCallback={loadColumnDataCallback}
            hideColumnDataCallback={hideColumnDataCallback}
            additionalEntries={additionalEntries}
            additionalIndices={additionalIndices}
        />
    )
}

export function ColumnMenuBody({
    columnIndices,
    additionalEntries = [],
    additionalIndices = {},
    loadColumnDataCallback,
    hideColumnDataCallback
}: {
    columnIndices: { [key: string]: number }
    additionalEntries?: { idPersistent: string; name: string }[]
    additionalIndices?: { [key: string]: number }
    loadColumnDataCallback: (columnDefinition: Column) => void
    hideColumnDataCallback: (columnDefinition: Column) => void
}) {
    const isLoading = useAppSelector(selectColumnSelectionLoading)

    return (
        <>
            <TabView
                isLoading={isLoading}
                tabList={[
                    {
                        name: 'Load',
                        component: (
                            <ShowTabBody
                                additionalIndices={additionalIndices}
                                columnIndices={columnIndices}
                                loadColumnDataCallback={loadColumnDataCallback}
                                hideColumnDataCallback={hideColumnDataCallback}
                                additionalEntries={additionalEntries}
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
    existingColumn
}: {
    additionalEntries?: { idPersistent: string; name: string }[]
    existingColumn?: Column
}) {
    return (
        <div className="d-contents overflow-hidden">
            <ColumnCreateForm existingColumn={existingColumn}>
                {(columnTypeCreateFormProps: ColumnTypeCreateFormProps) => (
                    <ColumnSelector
                        allowEdit={false}
                        additionalEntries={additionalEntries}
                        mkTailElement={(columnDefinition: Column) => (
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
            </ColumnCreateForm>
        </div>
    )
}

function ShowTabBody({
    columnIndices,
    additionalEntries,
    additionalIndices,
    loadColumnDataCallback,
    hideColumnDataCallback
}: {
    columnIndices: { [key: string]: number }
    additionalEntries: { idPersistent: string; name: string }[]
    additionalIndices: { [key: string]: number }
    loadColumnDataCallback: (columnDefinition: Column) => void
    hideColumnDataCallback: (columnDefinition: Column) => void
}) {
    return (
        <div className="ps-2 pe-2 d-contents overflow-hidden">
            <ColumnSelector
                additionalEntries={additionalEntries}
                mkTailElement={(columnDefinition: Column) => {
                    const isDisplayedInTable =
                        columnIndices[columnDefinition.idPersistent] !== undefined ||
                        additionalIndices[columnDefinition.idPersistent] !== undefined
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
