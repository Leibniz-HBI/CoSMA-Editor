import { useDispatch, useSelector } from 'react-redux'
import {
    selectDisplayTxtTagDefinitions,
    selectDisplayTxtTagIdPersistentSet
} from './selectors'
import { Col, ListGroup, Row } from 'react-bootstrap'
import { AppDispatch } from '../../store'
import { CosmaeLoading } from '../../util/components/misc'
import { TagDefinition } from '../../column_menu/state'
import { ColumnSelector } from '../../column_menu/components/selection'
import { TagDefinitionNamePath } from '../../column_menu/components/misc'
import { PlusLg, XLg } from 'react-bootstrap-icons'
import { useEffect } from 'react'
import {
    appendTagDefinitionThunk,
    getDisplayTxtTagDefinitions,
    removeTagDefinitionThunk
} from './thunks'
import { loadTagDefinitionHierarchy } from '../../column_menu/thunks'

export function DisplayTxtManagementComponent() {
    const dispatch: AppDispatch = useDispatch()
    useEffect(
        () => {
            dispatch(getDisplayTxtTagDefinitions())
            dispatch(loadTagDefinitionHierarchy({ expand: true }))
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )
    return (
        <Row className="h-100 overflow-hidden d-flex flex-row">
            <Col className="pt-2" xs={6}>
                <DisplayTxtOrder />
            </Col>
            <Col xs={6} className='h-100'>
                <DisplayTxtAddMenu />
            </Col>
        </Row>
    )
}

function DisplayTxtOrder() {
    const tagDefinitions = useSelector(selectDisplayTxtTagDefinitions)
    const dispatch: AppDispatch = useDispatch()
    const removeTagDefinitionCallback = (tagDef: TagDefinition) =>
        dispatch(removeTagDefinitionThunk(tagDef))
    if (tagDefinitions.isLoading) {
        return <CosmaeLoading />
    }
    return (
        <ListGroup>
            {tagDefinitions.value.map((tagDefinition, idx) => (
                <DisplayTxtOrderItem
                    key={idx}
                    tagDefinition={tagDefinition}
                    removeTagDefinitionCallback={removeTagDefinitionCallback}
                />
            ))}
        </ListGroup>
    )
}

function DisplayTxtOrderItem({
    tagDefinition,
    removeTagDefinitionCallback
}: {
    tagDefinition: TagDefinition
    removeTagDefinitionCallback: (tagDef: TagDefinition) => void
}) {
    return (
        <ListGroup.Item>
            <Row className="justify-content-between">
                <Col>
                    <TagDefinitionNamePath tagDefinition={tagDefinition} />
                </Col>
                <Col
                    xs="auto"
                    className="ms-1 me-1 align-top"
                    onClick={() => removeTagDefinitionCallback(tagDefinition)}
                    role="button"
                >
                    <XLg />
                </Col>
            </Row>
        </ListGroup.Item>
    )
}

function DisplayTxtAddMenu() {
    const dispatch: AppDispatch = useDispatch()
    const alreadyPresentTagDefIdPersistentList = useSelector(
        selectDisplayTxtTagIdPersistentSet
    )
    const appendTagDefinitionCallback = (tagDef: TagDefinition) =>
        dispatch(appendTagDefinitionThunk(tagDef))
    return (
        <ColumnSelector
            mkTailElement={(tagDef) => (
                <DisplayTxtAddTailElement
                    tagDefinition={tagDef}
                    alreadyPresent={
                        alreadyPresentTagDefIdPersistentList[tagDef.idPersistent]
                    }
                    appendTagDefinitionCallback={appendTagDefinitionCallback}
                />
            )}
        />
    )
}

function DisplayTxtAddTailElement({
    tagDefinition,
    alreadyPresent,
    appendTagDefinitionCallback
}: {
    tagDefinition: TagDefinition
    alreadyPresent: boolean
    appendTagDefinitionCallback: (tagDef: TagDefinition) => void
}) {
    if (!tagDefinition.curated || alreadyPresent) {
        return <></>
    }
    return (
        <div
            className="ms-1 me-1 align-text-top"
            onClick={() => appendTagDefinitionCallback(tagDefinition)}
        >
            <PlusLg />
        </div>
    )
}
