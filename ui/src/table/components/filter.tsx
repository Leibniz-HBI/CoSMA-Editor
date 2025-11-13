import { Button, Col, Dropdown, Row } from 'react-bootstrap'
import {
    FilterLiteral as IFilterLiteral,
    FilterComposite as IFilterComposite,
    FilterClause as IFilterClause,
    FilterPredicate,
    FilterOperator as IFilterOperator,
    newFilterLiteral,
    FilterOperator,
    isFilterLiteral,
    isFilterComposite,
    isFilterNegation,
    FilterNegation as IFilterNegation
} from '../state'
import { ColumnSearch } from '../../column_menu/components/search'
import { FormField } from '../../util/form'
import { ChangeEvent, useReducer, useState } from 'react'
import { PencilSquare, ThreeDots, Trash } from 'react-bootstrap-icons'
import { ColumnNamePathFromId } from '../../column_menu/components/misc'

interface FilterEditorFunctions {
    literalValueChanged: (path: number[], newValue: string) => void
    literalPredicateChanged: (path: number[], newPredicate: FilterPredicate) => void
    literalColumnChanged: (path: number[], newIdColumnPersistent: string) => void
    expandClause: (path: number[], operator: IFilterOperator) => void
    negateClause: (path: number[]) => void
    deleteClause: (path: number[]) => void
    setEdit(path: number[] | undefined): void
}
const _ACTION_LITERAL_VALUE_CHANGED = 'literal_value_changed'
const _ACTION_LITERAL_PREDICATE_CHANGED = 'literal_predicate_changed'
const _ACTION_LITERAL_COLUMN_CHANGED = 'literal_column_changed'
const _ACTION_EXPAND_CLAUSE = 'expand_clause'
const _ACTION_DELETE_CLAUSE = 'delete_clause'
const _ACTION_NEGATE_CLAUSE = 'negate_clause'

export function filterReducer(
    state: IFilterClause,
    action: { type: string; path: number[]; payload?: string }
): IFilterClause {
    const newState = structuredClone(state),
        targetPath: { target: IFilterComposite | IFilterNegation; idx: number }[] = []
    let target = newState
    for (const idx of action.path) {
        if (isFilterComposite(target)) {
            targetPath.push({ target, idx })
            target = target.clause_list[idx]
        } else if (isFilterNegation(target)) {
            target = target.clause
            targetPath.push({ target: target as IFilterNegation, idx: 0 })
        }
    }
    let newTarget
    switch (action.type) {
        case _ACTION_LITERAL_VALUE_CHANGED: {
            if (isFilterLiteral(target)) {
                newTarget = { ...target, value: action.payload ?? '' }
            }
            break
        }
        case _ACTION_LITERAL_PREDICATE_CHANGED: {
            if (isFilterLiteral(target)) {
                newTarget = {
                    ...target,
                    predicate: action.payload as FilterPredicate
                }
            }
            break
        }
        case _ACTION_LITERAL_COLUMN_CHANGED: {
            if (isFilterLiteral(target)) {
                newTarget = {
                    ...target,
                    idColumnPersistent: action.payload ?? ''
                }
            }
            break
        }
        case _ACTION_EXPAND_CLAUSE: {
            const operator = action.payload as IFilterOperator
            if (isFilterComposite(target)) {
                if (operator === target.operator) {
                    target.clause_list.push(newFilterLiteral('', ''))
                    newTarget = target
                    break
                }
            }
            newTarget = {
                operator: operator,
                clause_list: [target, newFilterLiteral('', '')]
            }
            break
        }
        case _ACTION_NEGATE_CLAUSE: {
            newTarget = {
                clause: target
            } as IFilterNegation
            break
        }
        case _ACTION_DELETE_CLAUSE: {
            break
        }
    }
    let targetPredecessor: IFilterComposite | undefined = undefined
    let lastPathIdx = 0
    if (newTarget === undefined) {
        // this implies delete
        for (let i = targetPath.length - 1; i >= 0; i--) {
            const targetPointer = targetPath[i].target
            if (isFilterComposite(targetPointer)) {
                if (i < targetPath.length - 1 || targetPointer.clause_list.length > 1) {
                    targetPredecessor = targetPath[i].target as IFilterComposite
                    lastPathIdx = targetPath[i].idx
                    break
                }
            }
        }
        if (
            targetPredecessor === undefined ||
            (isFilterComposite(targetPredecessor) &&
                targetPredecessor.clause_list.length <= 1)
        ) {
            return newFilterLiteral('', '')
        }
        if (isFilterComposite(targetPredecessor)) {
            targetPredecessor.clause_list.splice(lastPathIdx, 1)
        }
        return newState
    }
    for (let i = targetPath.length - 1; i >= 0; i--) {
        const targetPointer = targetPath[i].target
        if (isFilterComposite(targetPointer)) {
            targetPredecessor = targetPath[i].target as IFilterComposite
            lastPathIdx = targetPath[i].idx
            break
        }
    }
    if (targetPredecessor === undefined) {
        if (isFilterComposite(newTarget) && newTarget.clause_list.length == 0) {
            return newFilterLiteral('', '')
        }
        if (isFilterNegation(newTarget) && isFilterNegation(newTarget.clause)) {
            newTarget = (newTarget.clause as IFilterNegation).clause
        }
        return newTarget
    } else {
        if (
            isFilterNegation(newTarget) &&
            isFilterNegation(targetPredecessor.clause_list[lastPathIdx])
        ) {
            newTarget = (targetPredecessor.clause_list[lastPathIdx] as IFilterNegation)
                .clause
        }
        targetPredecessor.clause_list[lastPathIdx] = newTarget
        return newState
    }
}

export function FilterEditor({
    onSubmit,
    upUntilDate,
    filter
}: {
    onSubmit: (clause: IFilterClause | undefined) => void
    upUntilDate: Date | undefined
    filter?: IFilterClause | undefined
}) {
    const [clause, dispatch] = useReducer(
        filterReducer,
        filter ?? newFilterLiteral('', '')
    )
    const [editPathPart, setEditPathPart] = useState<number[] | undefined>(undefined)
    const functions: FilterEditorFunctions = {
        literalValueChanged: (path: number[], newValue: string) => {
            dispatch({
                type: _ACTION_LITERAL_VALUE_CHANGED,
                path,
                payload: newValue
            })
        },
        literalPredicateChanged: (path: number[], newPredicate: FilterPredicate) => {
            dispatch({
                type: _ACTION_LITERAL_PREDICATE_CHANGED,
                path,
                payload: newPredicate
            })
        },
        literalColumnChanged: (path: number[], newIdColumnPersistent: string) => {
            dispatch({
                type: _ACTION_LITERAL_COLUMN_CHANGED,
                path,
                payload: newIdColumnPersistent
            })
            setEditPathPart(undefined)
        },
        expandClause: (path: number[], operator: IFilterOperator) => {
            dispatch({
                type: _ACTION_EXPAND_CLAUSE,
                path,
                payload: operator
            })
        },
        deleteClause: (path: number[]) => {
            dispatch({ type: _ACTION_DELETE_CLAUSE, path })
        },
        negateClause: (path: number[]) => {
            dispatch({ type: _ACTION_NEGATE_CLAUSE, path })
        },
        setEdit: (path: number[] | undefined) => {
            setEditPathPart(path)
        }
    }
    return (
        <Col className="h-95 d-flex flex-column">
            <Row className="h-95 mb-4 flex-grow-1 overflow-y-scroll">
                <Col>
                    <FilterClause
                        clause={clause}
                        path={[]}
                        editPathPart={editPathPart}
                        functions={functions}
                        upUntilDate={upUntilDate}
                        depth={0}
                    />
                </Col>
            </Row>
            <Row>
                <Col />
                <Col xs="auto">
                    <Button
                        variant="primary"
                        onClick={() => {
                            if (isFilterLiteral(clause)) {
                                if (clause.idColumnPersistent == '') {
                                    onSubmit(undefined)
                                    return
                                }
                            }
                            onSubmit(clause)
                        }}
                    >
                        Submit
                    </Button>
                </Col>
            </Row>
        </Col>
    )
}

export function FilterClause({
    clause,
    path,
    editPathPart,
    functions,
    upUntilDate,
    depth
}: {
    clause: IFilterClause
    path: number[]
    editPathPart: number[] | undefined
    functions: FilterEditorFunctions
    upUntilDate: Date | undefined
    depth: number
}) {
    let body
    let classname = 'border border-black-subtle mt-1 mb-1 bg-secondary-subtle'
    if (depth % 2 == 1) {
        classname = 'border border-black-subtle mt-1 mb-1 bg-white'
    }
    if (isFilterComposite(clause)) {
        body = (
            <FilterComposite
                composite={clause as IFilterComposite}
                path={path}
                editPathPart={editPathPart}
                functions={functions}
                upUntilDate={upUntilDate}
                depth={depth + 1}
            />
        )
    } else if (isFilterLiteral(clause)) {
        body = (
            <FilterLiteral
                literal={clause as IFilterLiteral}
                path={path}
                editColumn={editPathPart?.length == 0}
                functions={functions}
                upUntilDate={upUntilDate}
            />
        )
    } else {
        body = (
            <FilterNegation
                clause={clause as IFilterNegation}
                path={path}
                editPathPart={editPathPart}
                functions={functions}
                upUntilDate={upUntilDate}
                depth={depth + 1}
            />
        )
    }
    return (
        <Row className={classname}>
            <Col>{body}</Col>
            <Col xs="auto">
                <div className="w-4em">
                    <Dropdown>
                        <Dropdown.Toggle variant="primary" size="sm">
                            <ThreeDots />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item
                                as="button"
                                onClick={() => {
                                    functions.expandClause(path, FilterOperator.AND)
                                }}
                            >
                                <span>AND</span>
                            </Dropdown.Item>

                            <Dropdown.Item
                                as="button"
                                onClick={() =>
                                    functions.expandClause(path, FilterOperator.OR)
                                }
                            >
                                OR
                            </Dropdown.Item>
                            <Dropdown.Item
                                as="button"
                                onClick={() => functions.negateClause(path)}
                            >
                                NOT
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item
                                as="button"
                                onClick={() => functions.deleteClause(path)}
                            >
                                <span className="text-danger">
                                    <Trash />
                                </span>
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </Col>
        </Row>
    )
}

export function FilterComposite({
    composite,
    path,
    editPathPart,
    functions,
    upUntilDate,
    depth
}: {
    composite: IFilterComposite
    path: number[]
    editPathPart: number[] | undefined
    functions: FilterEditorFunctions
    upUntilDate: Date | undefined
    depth: number
}) {
    return (
        <Row>
            <Col>
                {composite.clause_list.map((part, idx) => (
                    <Row key={idx}>
                        <Col xs="auto">
                            {idx != 0 ? composite.operator.toString() : ''}
                        </Col>
                        <Col>
                            <FilterClause
                                clause={part}
                                path={[...path, idx]}
                                editPathPart={
                                    editPathPart?.at(0) == idx
                                        ? editPathPart?.slice(1)
                                        : undefined
                                }
                                functions={functions}
                                upUntilDate={upUntilDate}
                                depth={depth}
                            />
                        </Col>
                    </Row>
                ))}
            </Col>
        </Row>
    )
}

export function FilterNegation({
    clause,
    path,
    editPathPart,
    functions,
    upUntilDate,
    depth
}: {
    clause: IFilterNegation
    path: number[]
    editPathPart: number[] | undefined
    functions: FilterEditorFunctions
    upUntilDate: Date | undefined
    depth: number
}) {
    return (
        <Row>
            <Col xs="auto">NOT</Col>
            <Col>
                <FilterClause
                    clause={clause.clause}
                    path={[...path, 0]}
                    editPathPart={
                        editPathPart?.at(0) == 0 ? editPathPart?.slice(1) : undefined
                    }
                    functions={functions}
                    upUntilDate={upUntilDate}
                    depth={depth}
                />
            </Col>
        </Row>
    )
}

export function FilterLiteral({
    literal,
    path,
    editColumn,
    functions,
    upUntilDate = undefined
}: {
    literal: IFilterLiteral
    path: number[]
    editColumn: boolean
    functions: FilterEditorFunctions
    upUntilDate?: Date | undefined
}) {
    return (
        <Row>
            <Col>
                <FilterLiteralColumn
                    idColumnPersistent={literal.idColumnPersistent}
                    is_editing={editColumn}
                    onColumnSelected={(idColumnPersistent) =>
                        functions.literalColumnChanged(path, idColumnPersistent)
                    }
                    onEditSelected={() => functions.setEdit(path)}
                    upUntilDate={upUntilDate}
                />
            </Col>
            <Col xs="auto">
                <FilterPredicateSymbol
                    predicate={literal.predicate}
                    path={path}
                    setPredicate={functions.literalPredicateChanged}
                />
            </Col>
            <Col>
                <FormField
                    name="Filter Value"
                    label="Filter Value"
                    value={literal.value}
                    handleChange={(e: ChangeEvent<HTMLInputElement>) => {
                        functions.literalValueChanged(path, e.target.value)
                    }}
                />
            </Col>
        </Row>
    )
}

function predicateToSymbol(predicate: FilterPredicate): string {
    switch (predicate) {
        case FilterPredicate.EQUALS:
            return '='
        case FilterPredicate.NOT_EQUALS:
            return '≠'
        default:
            return '?'
    }
}

function FilterPredicateSymbol({
    predicate,
    path,
    setPredicate
}: {
    predicate: FilterPredicate
    path: number[]
    setPredicate: (path: number[], newPredicate: FilterPredicate) => void
}) {
    let otherPredicate = FilterPredicate.NOT_EQUALS
    if (predicate === FilterPredicate.NOT_EQUALS) {
        otherPredicate = FilterPredicate.EQUALS
    }
    return (
        <Dropdown>
            <Dropdown.Toggle>{predicateToSymbol(predicate)}</Dropdown.Toggle>
            <Dropdown.Menu>
                <Dropdown.Item onClick={() => setPredicate(path, otherPredicate)}>
                    {predicateToSymbol(otherPredicate)}
                </Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    )
}

function FilterLiteralColumn({
    idColumnPersistent,
    is_editing,
    onColumnSelected,
    onEditSelected,
    upUntilDate
}: {
    idColumnPersistent: string
    is_editing: boolean
    onColumnSelected: (idColumnPersistent: string) => void
    onEditSelected: () => void
    upUntilDate: Date | undefined
}) {
    if (is_editing) {
        return (
            <ColumnSearch
                onSearchResultClicked={(idColumnPersistent) =>
                    onColumnSelected(idColumnPersistent)
                }
                upUntilDate={upUntilDate}
            />
        )
    }
    if (idColumnPersistent == '') {
        return (
            <Button variant="outline-primary" onClick={onEditSelected}>
                Select Column
            </Button>
        )
    }
    return (
        <Row>
            <Col>
                <ColumnNamePathFromId idColumnPersistent={idColumnPersistent} />
            </Col>
            <Col xs="auto">
                <Button variant="outline-primary" onClick={onEditSelected}>
                    <PencilSquare />
                </Button>
            </Col>
        </Row>
    )
}
