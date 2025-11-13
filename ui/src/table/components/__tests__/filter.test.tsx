/**
 * @vitest-environment jsdom
 */
import userEvent from '@testing-library/user-event'
import {
    ColumnType,
    newColumn,
    newColumnSelectionState
} from '../../../column_menu/state'
import { newRemote } from '../../../util/state'
import { emptyState, renderWithProviders } from '../../../util/tests/provider'
import { addResponseSequence } from '../../../util/tests/response'
import {
    FilterLiteral as IFilterLiteral,
    FilterPredicate as IFilterPredicate,
    FilterComposite as IFilterComposite,
    FilterOperator as IFilterOperator,
    FilterNegation as IFilterNegation,
    newFilterLiteral
} from '../../state'
import { FilterLiteral, filterReducer } from '../filter'
import { waitFor, screen } from '@testing-library/react'

describe('reducer actions', () => {
    test('literal predicate changed', () => {
        const initialFilter: IFilterLiteral = {
            idColumnPersistent: 'col1',
            predicate: IFilterPredicate.EQUALS,
            value: 'test'
        }
        const action = {
            type: 'literal_predicate_changed',
            payload: IFilterPredicate.NOT_EQUALS,
            path: []
        }
        const expectedFilter: IFilterLiteral = {
            idColumnPersistent: 'col1',
            predicate: IFilterPredicate.NOT_EQUALS,
            value: 'test'
        }
        const newFilter = filterReducer(initialFilter, action)
        expect(newFilter).toEqual(expectedFilter)
    })
    test('literal value changed', () => {
        const initialFilter: IFilterLiteral = {
            idColumnPersistent: 'col1',
            predicate: IFilterPredicate.EQUALS,
            value: 'test'
        }
        const newValue = 'newValue'
        const action = {
            type: 'literal_value_changed',
            payload: newValue,
            path: []
        }
        const expectedFilter: IFilterLiteral = {
            idColumnPersistent: 'col1',
            predicate: IFilterPredicate.EQUALS,
            value: newValue
        }
        const newFilter = filterReducer(initialFilter, action)
        expect(newFilter).toEqual(expectedFilter)
    })
    test('literal column changed', () => {
        const initialFilter: IFilterLiteral = {
            idColumnPersistent: 'col1',
            predicate: IFilterPredicate.EQUALS,
            value: 'test'
        }
        const newColumnId = 'col2'
        const action = {
            type: 'literal_column_changed',
            payload: newColumnId,
            path: []
        }
        const expectedFilter: IFilterLiteral = {
            idColumnPersistent: newColumnId,
            predicate: IFilterPredicate.EQUALS,
            value: 'test'
        }
        const newFilter = filterReducer(initialFilter, action)
        expect(newFilter).toEqual(expectedFilter)
    })
    const literal0 = newFilterLiteral('id0', 'value0')
    const literal1 = newFilterLiteral('id1', 'value1')
    const andFilter: IFilterComposite = {
        operator: 'AND' as IFilterOperator,
        clause_list: [literal0, literal1]
    }
    test('composite operator changed', () => {
        const action = {
            type: 'expand_clause',
            payload: 'OR',
            path: []
        }
        const expectedFilter = {
            operator: 'OR',
            clause_list: [
                andFilter,
                {
                    idColumnPersistent: '',
                    predicate: IFilterPredicate.EQUALS,
                    value: ''
                }
            ]
        }
        const newFilter = filterReducer(andFilter, action)
        expect(newFilter).toEqual(expectedFilter)
    })
    test('composite operator changed nested', () => {
        const initialFilter: IFilterComposite = {
            operator: 'AND' as IFilterOperator,
            clause_list: [
                literal0,
                {
                    operator: 'AND' as IFilterOperator,
                    clause_list: [literal1]
                }
            ]
        }
        const action = {
            type: 'expand_clause',
            payload: 'AND',
            path: [1, 0]
        }
        const expectedFilter = {
            operator: 'AND',
            clause_list: [
                literal0,
                {
                    operator: 'AND',
                    clause_list: [
                        {
                            operator: 'AND',
                            clause_list: [
                                literal1,
                                {
                                    idColumnPersistent: '',
                                    predicate: IFilterPredicate.EQUALS,
                                    value: ''
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        const newFilter = filterReducer(initialFilter, action)
        expect(newFilter).toEqual(expectedFilter)
    })
    test('composite operator expand same', () => {
        const action = {
            type: 'expand_clause',
            path: [],
            payload: 'AND'
        }
        const newFilter = filterReducer(andFilter, action)
        expect(newFilter).toEqual({
            ...andFilter,
            clause_list: [
                ...andFilter.clause_list,
                {
                    idColumnPersistent: '',
                    predicate: IFilterPredicate.EQUALS,
                    value: ''
                }
            ]
        })
    })
    test('composite delete clause', () => {
        const action = {
            type: 'delete_clause',
            path: [1]
        }
        const expectedFilter = {
            operator: 'AND',
            clause_list: [literal0]
        }
        const newFilter = filterReducer(andFilter, action)
        expect(newFilter).toEqual(expectedFilter)
    })
    test('composite delete clause root', () => {
        const action = {
            type: 'delete_clause',
            path: []
        }
        const expectedFilter = newFilterLiteral('', '')
        const newFilter = filterReducer(andFilter, action)
        expect(newFilter).toEqual(expectedFilter)
    })
    test('negation', () => {
        const initialFilter: IFilterLiteral = {
            idColumnPersistent: 'col1',
            predicate: IFilterPredicate.EQUALS,
            value: 'test'
        }
        const action = {
            type: 'negate_clause',
            path: []
        }
        const expectedFilter: IFilterNegation = {
            clause: initialFilter
        }
        const result = filterReducer(initialFilter, action)
        expect(result).toEqual(expectedFilter)
    })
    test('literal double negation', () => {
        const expectedFilter: IFilterLiteral = {
            idColumnPersistent: 'col1',
            predicate: IFilterPredicate.EQUALS,
            value: 'test'
        }
        const action = {
            type: 'negate_clause',
            path: []
        }
        const initialFilter: IFilterNegation = {
            clause: expectedFilter
        }
        const result = filterReducer(initialFilter, action)
        expect(result).toEqual(expectedFilter)
    })
    test('nested double negation', () => {
        const literal0 = {
            idColumnPersistent: 'col0',
            predicate: IFilterPredicate.EQUALS,
            value: 'test 0'
        }
        const literal1 = {
            idColumnPersistent: 'col1',
            predicate: IFilterPredicate.EQUALS,
            value: 'test 1'
        }
        const literal2 = {
            idColumnPersistent: 'col2',
            predicate: IFilterPredicate.EQUALS,
            value: 'test 2'
        }
        const initialFilter: IFilterComposite = {
            operator: IFilterOperator.AND,
            clause_list: [
                literal0,

                {
                    operator: IFilterOperator.OR,
                    clause_list: [literal1, { clause: literal2 }]
                }
            ]
        }
        const expectedFilter: IFilterComposite = {
            operator: IFilterOperator.AND,
            clause_list: [
                literal0,

                {
                    operator: IFilterOperator.OR,
                    clause_list: [literal1, literal2]
                }
            ]
        }
        const action = {
            type: 'negate_clause',
            path: [1, 1]
        }
        const result = filterReducer(initialFilter, action)
        expect(result).toEqual(expectedFilter)
    })
})
describe('literal component', () => {
    test('set column', async () => {
        const fetchMock = vi.fn()
        addResponseSequence(fetchMock, [
            [200, { id_persistent_list: [idColumn0, idColumn1] }]
        ])
        const literal = newFilterLiteral('', '')
        const functions = {
            literalValueChanged: vi.fn(),
            literalColumnChanged: vi.fn(),
            literalPredicateChanged: vi.fn(),
            expandClause: vi.fn(),
            negateClause: vi.fn(),
            deleteClause: vi.fn(),
            setEdit: vi.fn()
        }
        renderWithProviders(
            <FilterLiteral
                literal={literal}
                functions={functions}
                path={[]}
                editColumn={true}
            />,
            fetchMock,
            initialState
        )
        const user = userEvent.setup()
        await waitFor(() => {
            const textboxList = screen.getAllByRole('textbox')
            expect(textboxList).toHaveLength(2)
            user.type(textboxList[0], 'a')
        })
        await waitFor(() => {
            const text = screen.getByText(nameColumn0)
            user.click(text)
        })
        await waitFor(() => {
            expect(functions.literalColumnChanged).toHaveBeenCalledWith([], idColumn0)
        })
    })
    test('set value', async () => {
        const fetchMock = vi.fn()
        const literal = newFilterLiteral('', '')
        const functions = {
            literalValueChanged: vi.fn(),
            literalColumnChanged: vi.fn(),
            literalPredicateChanged: vi.fn(),
            expandClause: vi.fn(),
            deleteClause: vi.fn(),
            negateClause: vi.fn(),
            setEdit: vi.fn()
        }
        renderWithProviders(
            <FilterLiteral
                literal={literal}
                functions={functions}
                path={[]}
                editColumn={true}
            />,
            fetchMock,
            initialState
        )
        const user = userEvent.setup()
        await waitFor(() => {
            const textboxList = screen.getAllByRole('textbox')
            expect(textboxList).toHaveLength(2)
            user.type(textboxList[1], 'a')
        })
        await waitFor(() => {
            expect(functions.literalValueChanged).toHaveBeenCalledWith([], 'a')
        })
    })
    test('set predicate', async () => {
        const fetchMock = vi.fn()
        const literal = newFilterLiteral('', '')
        const functions = {
            literalValueChanged: vi.fn(),
            literalColumnChanged: vi.fn(),
            literalPredicateChanged: vi.fn(),
            expandClause: vi.fn(),
            deleteClause: vi.fn(),
            negateClause: vi.fn(),
            setEdit: vi.fn()
        }
        renderWithProviders(
            <FilterLiteral
                literal={literal}
                functions={functions}
                path={[]}
                editColumn={true}
            />,
            fetchMock,
            initialState
        )
        const user = userEvent.setup()
        await waitFor(() => {
            const buttons = screen.getAllByRole('button')
            expect(buttons).toHaveLength(1)
            user.click(buttons[0])
        })
        await waitFor(() => {
            const option = screen.getByText('≠')
            user.click(option)
        })
        await waitFor(() => {
            expect(functions.literalPredicateChanged).toHaveBeenCalledWith([], 'NEQ')
        })
    })
})

const idColumn0 = 'idColumn0'
const nameColumn0 = 'Column 0'
const idColumn1 = 'idColumn1'
const nameColumn1 = 'Column 1'

const preloadedState = {
    ...emptyState,
    columnSelection: newColumnSelectionState({
        columnsByIdPersistent: {
            [idColumn0]: newRemote(
                newColumn({
                    idPersistent: idColumn0,
                    namePath: [nameColumn0],
                    columnType: ColumnType.String,
                    curated: true,
                    hidden: false,
                    version: 0
                })
            ),
            [idColumn1]: newRemote(
                newColumn({
                    idPersistent: idColumn1,
                    namePath: [nameColumn1],
                    columnType: ColumnType.String,
                    curated: true,
                    hidden: false,
                    version: 0
                })
            )
        }
    })
}

const initialState = { preloadedState }
