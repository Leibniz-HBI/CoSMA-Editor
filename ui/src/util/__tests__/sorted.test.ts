import { findIndexInSorted } from '../sorted'

test('empty', () => {
    const idx = findIndexInSorted([], 5, (val) => val)
    expect(idx).toEqual(0)
})
test('single element equal', () => {
    const idx = findIndexInSorted([5], 5, (val) => val)
    expect(idx).toEqual(0)
})
test('new at beginning', () => {
    const idx = findIndexInSorted(
        Array.from({ length: 17 }, (_, idx) => idx * 2 + 2),
        1,
        (val) => val
    )
    expect(idx).toEqual(0)
})
test('new at end', () => {
    const idx = findIndexInSorted(
        Array.from({ length: 17 }, (_, idx) => idx * 2 + 2),
        100,
        (val) => val
    )
    expect(idx).toEqual(17)
})

test('new at one before end', () => {
    const idx = findIndexInSorted(
        Array.from({ length: 17 }, (_, idx) => idx * 2 + 2),
        35,
        (val) => val
    )
    expect(idx).toEqual(17)
})

test('existing at beginning', () => {
    const idx = findIndexInSorted(
        Array.from({ length: 17 }, (_, idx) => idx * 2 + 2),
        2,
        (val) => val
    )
    expect(idx).toEqual(0)
})
test('existing at end', () => {
    const idx = findIndexInSorted(
        Array.from({ length: 17 }, (_, idx) => idx * 2 + 2),
        36,
        (val) => val
    )
    expect(idx).toEqual(17)
})

test('at one before end', () => {
    const idx = findIndexInSorted(
        Array.from({ length: 17 }, (_, idx) => idx * 2 + 2),
        34,
        (val) => val
    )
    expect(idx).toEqual(16)
})
