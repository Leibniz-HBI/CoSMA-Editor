import { constructColumnTitleSpans } from '../selection'

describe('create column name', () => {
    const levels = ['first', 'second', 'third', 'fourth']
    test('empty', () => {
        expect(constructColumnTitleSpans([])).toEqual([<span>UNKNOWN</span>])
    })
    test('single level', () => {
        expect(constructColumnTitleSpans(levels.slice(0, 1))).toEqual([
            <span className="no-wrap" key="path-part-0">
                {'first '}
            </span>
        ])
    })
    test('two levels', () => {
        expect(constructColumnTitleSpans(levels.slice(0, 2))).toEqual([
            <span className="no-wrap" key="path-part-0">
                {'first '}
            </span>,
            <span className="no-wrap" key="path-part-1">
                {'-> second '}
            </span>
        ])
    })
    test('three levels', () => {
        expect(constructColumnTitleSpans(levels.slice(0, 3))).toEqual([
            <span className="no-wrap" key="path-part-0">
                {'first '}
            </span>,
            <span className="no-wrap" key="path-part-1">
                {'-> second '}
            </span>,
            <span className="no-wrap" key="path-part-2">
                {'-> third '}
            </span>
        ])
    })
    test('four levels', () => {
        expect(constructColumnTitleSpans(levels.slice(0, 4))).toEqual([
            <span className="no-wrap" key="path-part-0">
                {'first '}
            </span>,
            <span className="no-wrap" key="path-part-1">
                {'-> ... '}
            </span>,
            <span className="no-wrap" key="path-part-2">
                {'-> third '}
            </span>,
            <span className="no-wrap" key="path-part-3">
                {'-> fourth'}
            </span>
        ])
    })
})
