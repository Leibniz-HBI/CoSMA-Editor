import { Formik, FormikErrors, FormikTouched } from 'formik'
import { ChangeEvent, ChangeEventHandler, FormEvent, ReactNode } from 'react'
import { Button, Col, Row, Form, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { Column, ColumnType } from '../state'
import * as yup from 'yup'
import { submitColumn, loadColumnHierarchy, purgeColumn } from '../thunks'
import { AppDispatch } from '../../store'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { FormField, TextConfirmedSubmit } from '../../util/form'
import { QuestionCircleFill } from 'react-bootstrap-icons'
import { TabView } from '../../util/components/tabs'
import { CosmaeCard } from '../../util/components/misc'
import { addSuccessVanish } from '../../util/notification/slice'
import { PublicUserInfo, UserPermissionGroup } from '../../user/state'
import { selectPermissionGroup } from '../../auth/selectors'

const schema = yup.object({
    columnType: yup
        .string()
        .required()
        .matches(/STRING|FLOAT|INNER|BOOL/),
    name: yup.string().required()
})

export type ColumnTypeCreateArgs = {
    columnType: string
    name: string
    parent: string
    description: string
}

export type ColumnTypeCreateFormProps = {
    selectedParent: string
    setParent: (idPersistent: string, namePath: string[]) => Promise<void>
    errors: FormikErrors<ColumnTypeCreateArgs>
}
const emptyColumnValues = {
    columnType: '',
    name: '',
    parent: '',
    description: '',
    parentNamePath: [] as string[]
}

export function ColumnCreateForm({
    existingColumn = undefined,
    children
}: {
    existingColumn?: Column
    children: (formProps: ColumnTypeCreateFormProps) => ReactNode
}) {
    const createForm = (
        <ColumnEditor existingColumn={existingColumn}>{children}</ColumnEditor>
    )
    if (existingColumn === undefined) {
        return createForm
    }
    return (
        <TabView
            tabList={[
                { name: 'Edit', component: createForm },
                // {
                //     name: 'Permissions',
                //     component: (
                //         <PermissionManager
                //             idResourcePersistent={existingColumn.idPersistent}
                //         />
                //     )
                // },
                {
                    name: 'Delete',
                    component: <ColumnDeleteForm column={existingColumn} />
                }
            ]}
            initialTabIdx={0}
        />
    )
}

export function ColumnEditor({
    existingColumn = undefined,
    children
}: {
    existingColumn?: Column
    children: (formProps: ColumnTypeCreateFormProps) => ReactNode
}) {
    const dispatch: AppDispatch = useAppDispatch()
    let initialValues = emptyColumnValues
    if (existingColumn !== undefined) {
        initialValues = {
            columnType: existingColumn.columnType as string,
            name: existingColumn.namePath.at(-1) ?? '',
            parent: existingColumn.idParentPersistent ?? '',
            description: existingColumn.description ?? '',
            parentNamePath: existingColumn?.namePath.slice(0, -1) ?? []
        }
    }
    return (
        <Formik
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={(values) => {
                dispatch(
                    submitColumn({
                        version: existingColumn?.version,
                        idPersistent: existingColumn?.idPersistent,
                        namePath: existingColumn?.namePath,
                        name: values.name,
                        description: values.description,
                        idParentPersistent:
                            values.parent == '' ? undefined : values.parent,
                        type: values.columnType as ColumnType,
                        disabled: existingColumn?.disabled ?? false,
                        parentNamePath: values.parentNamePath
                    })
                ).then((success) => {
                    if (success) {
                        dispatch(loadColumnHierarchy({ expand: true }))
                    }
                })
            }}
        >
            {({
                handleSubmit,
                handleChange,
                values,
                errors,
                touched,
                setFieldValue
            }) => (
                <ColumnTypeCreateFormBody
                    handleSubmit={handleSubmit}
                    touchedValues={touched}
                    formErrors={errors}
                    handleChange={handleChange}
                    formValues={values}
                    children={children}
                    setParent={async (idPersistent, namePath) => {
                        setFieldValue('parent', idPersistent)
                        setFieldValue('parentNamePath', namePath)
                    }}
                    ownerInfo={existingColumn && existingColumn.owner}
                />
            )}
        </Formik>
    )
}

function ColumnTypeCreateFormBody(props: {
    handleSubmit: (e: FormEvent<HTMLFormElement> | undefined) => void
    touchedValues: FormikTouched<ColumnTypeCreateArgs>
    formErrors: FormikErrors<ColumnTypeCreateArgs>
    handleChange: {
        (e: ChangeEvent): void
        <T = string | ChangeEvent>(field: T): T extends ChangeEvent
            ? void
            : (e: string | ChangeEvent) => void
    }
    setParent: (idPersistent: string, parentNamePath: string[]) => Promise<void>
    formValues: ColumnTypeCreateArgs
    ownerInfo: PublicUserInfo | undefined
    children: (formProps: ColumnTypeCreateFormProps) => ReactNode
}): JSX.Element {
    const alreadyExists = props.ownerInfo !== undefined
    const permissionGroup = useAppSelector(selectPermissionGroup)
    return (
        <Form noValidate onSubmit={props.handleSubmit} className="mt-3 d-contents">
            <div className=" d-contents">
                <Col className="d-contents">
                    <Row className="overflow-hidden flex-shrink-0 flex-grow-0 ms-1 me-1">
                        <Col className="align-self-center">
                            <Row>
                                <Col>
                                    <FormField
                                        name="name"
                                        handleChange={props.handleChange}
                                        type="text"
                                        value={props.formValues.name}
                                        label="Name"
                                        error={props.formErrors.name}
                                        isTouched={props.touchedValues.name}
                                    />
                                </Col>
                            </Row>
                            {(permissionGroup == UserPermissionGroup.COMMISSIONER ||
                                permissionGroup == UserPermissionGroup.EDITOR) && (
                                <Row>
                                    <div>Owned by: </div>
                                    <div className="fw-bold">
                                        {props.ownerInfo?.username ?? 'Unknown'}
                                    </div>
                                </Row>
                            )}
                            <Row className="mb-3">
                                <Col xs={4} className="align-self-center">
                                    {props.touchedValues.columnType &&
                                    !!props.formErrors.columnType ? (
                                        <span className="invalid-feedback">
                                            Choose a type:
                                        </span>
                                    ) : (
                                        <span className="fs-6">Choose a type:</span>
                                    )}
                                </Col>
                                <Col xs={8} className="align-self-center">
                                    <Row className="justify-content-center d-flex flex-nowrap">
                                        <Col>
                                            <Form.Check
                                                inline
                                                type="radio"
                                                name="columnType"
                                                label="boolean"
                                                value={ColumnType.Boolean}
                                                checked={
                                                    props.formValues.columnType ===
                                                    ColumnType.Boolean
                                                }
                                                onChange={props.handleChange}
                                                disabled={alreadyExists}
                                                isInvalid={
                                                    props.touchedValues.columnType &&
                                                    !!props.formErrors.columnType
                                                }
                                            />
                                        </Col>
                                        <Col>
                                            <Form.Check
                                                inline
                                                type="radio"
                                                label="string"
                                                name="columnType"
                                                value={ColumnType.String}
                                                checked={
                                                    props.formValues.columnType ===
                                                    ColumnType.String
                                                }
                                                onChange={props.handleChange}
                                                disabled={alreadyExists}
                                                isInvalid={
                                                    props.touchedValues.columnType &&
                                                    !!props.formErrors.columnType
                                                }
                                            />
                                        </Col>
                                        <Col>
                                            <Form.Check
                                                inline
                                                type="radio"
                                                name="columnType"
                                                label="number"
                                                value={ColumnType.Float}
                                                checked={
                                                    props.formValues.columnType ===
                                                    ColumnType.Float
                                                }
                                                onChange={props.handleChange}
                                                disabled={alreadyExists}
                                                isInvalid={
                                                    props.touchedValues.columnType &&
                                                    !!props.formErrors.columnType
                                                }
                                            />
                                        </Col>
                                        <Col>
                                            <NavigationTypeLabel
                                                checked={
                                                    props.formValues.columnType ===
                                                    ColumnType.Inner
                                                }
                                                onChange={props.handleChange}
                                                disabled={alreadyExists}
                                                isInvalid={
                                                    props.touchedValues.columnType &&
                                                    !!props.formErrors.columnType
                                                }
                                            />
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                            <FormField
                                name="description"
                                handleChange={props.handleChange}
                                type="text"
                                value={props.formValues.description}
                                label="description"
                                error={props.formErrors.description}
                                isTouched={props.touchedValues.description}
                                as="textarea"
                                className="min-h-100px"
                            />
                        </Col>
                    </Row>
                </Col>

                <Col className="d-contents">
                    <Row className="ms-1 flex-grow-0 flex-shrink-0">
                        <span className="fst-italic fw-bold">
                            Select parent from below
                        </span>
                    </Row>
                    <div className="overflow-hidden d-contents">
                        {props.children({
                            setParent: props.setParent,
                            selectedParent: props.formValues.parent,
                            errors: props.formErrors
                        })}
                    </div>
                </Col>
            </div>
            <Row className="pt-2 pb-1 ms-0 me-0 flex-grow-0 flex-shrink-0 justify-content-end">
                <Col xs="auto">
                    <Button type="submit">{alreadyExists ? 'Save' : 'Create'}</Button>
                </Col>
            </Row>
        </Form>
    )
}

function NavigationTypeLabel({
    checked,
    onChange,
    disabled,
    isInvalid
}: {
    checked: boolean
    onChange: ChangeEventHandler<HTMLInputElement>
    disabled: boolean
    isInvalid: boolean | undefined
}) {
    return (
        <OverlayTrigger
            placement="bottom"
            delay={{ show: 250, hide: 400 }}
            overlay={(props) => (
                <Tooltip className="z-3000" id="navigation-type-explanation" {...props}>
                    Navigational columns are used to structure the column tree. They are
                    not allowed to contain any data.
                </Tooltip>
            )}
            trigger={['hover', 'focus']}
        >
            <Row>
                <Form.Check
                    inline
                    type="radio"
                    name="columnType"
                    label={
                        <>
                            <span>Navigation </span>
                            <span>
                                <QuestionCircleFill />
                            </span>
                        </>
                    }
                    value={ColumnType.Inner}
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    isInvalid={isInvalid}
                />
            </Row>
        </OverlayTrigger>
    )
}

export function ColumnDeleteForm({ column }: { column: Column }) {
    const dispatch = useAppDispatch()
    return (
        <Col className="d-contents h-100 ms-3 me-3">
            <Row className="justify-content-center h-100 overflow-hidden">
                <Col xs="auto" className="max-w-800px overflow-y-auto h-100">
                    <Row className="mb-4">
                        <Col>
                            <CosmaeCard
                                header="Disable"
                                bodyClassName="bg-white ps-3 pe-3 pt-2 pb-1"
                            >
                                <Col>
                                    <Row>
                                        <Col>
                                            <span>Type </span>
                                            <span className="fw-bold">DISABLE </span>
                                            <span>in the </span>
                                            <span className="fst-italic">Confirm </span>
                                            <span>
                                                text box and submit to disable the
                                                column. This will make it and the
                                                contained data inaccessible from now on
                                                but the data will still be available in
                                                the history.
                                            </span>
                                        </Col>
                                    </Row>
                                    <TextConfirmedSubmit
                                        requiredInput="DISABLE"
                                        onSubmit={() =>
                                            dispatch(
                                                submitColumn({
                                                    ...column,
                                                    type: column.columnType,
                                                    parentNamePath:
                                                        column.namePath.slice(0, -1),
                                                    name: column.namePath.at(-1) ?? '',
                                                    namePath: column.namePath,
                                                    description:
                                                        column.description ?? '',
                                                    disabled: true
                                                })
                                            ).then((success) => {
                                                if (success) {
                                                    dispatch(
                                                        addSuccessVanish(
                                                            'Successfully disabled column definition.'
                                                        )
                                                    )
                                                }
                                            })
                                        }
                                    />
                                </Col>
                            </CosmaeCard>
                        </Col>
                    </Row>
                    <Row className="mb-4">
                        <Col>
                            <CosmaeCard
                                header="Purge"
                                bodyClassName="bg-white ps-3 pe-3 pt-2 pb-1"
                            >
                                <Row>
                                    <Col>
                                        <span>Type </span>
                                        <span className="fw-bold">PURGE </span>
                                        <span>in the </span>
                                        <span className="fst-italic">Confirm </span>
                                        <span>
                                            text box and submit to purge the column and
                                            all contained data from the history.
                                        </span>
                                    </Col>
                                </Row>
                                <TextConfirmedSubmit
                                    requiredInput="PURGE"
                                    onSubmit={() => dispatch(purgeColumn(column))}
                                />
                            </CosmaeCard>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Col>
    )
}
