export function findIndexInSorted<T>(sorted: T[], value: T, sortKey: (t: T) => number) {
    let low = 0
    let high = sorted.length

    while (low < high) {
        const mid = (low + high) >>> 1
        if (sortKey(sorted[mid]) < sortKey(value)) {
            low = mid + 1
        } else high = mid
    }
    return low
}

export function addSorted<T>(sorted: T[], value: T, sortKey: (t: T) => number) {
    const idx = findIndexInSorted(sorted, value, sortKey)
    return [...sorted.splice(0, idx), value, ...sorted.splice(idx)]
}

export function removeSorted<T>(sorted: T[], value: T, sortKey: (t: T) => number) {
    const idx = findIndexInSorted(sorted, value, sortKey)
    if (sorted[idx] == value) {
        return [...sorted.splice(0, idx), ...sorted.splice(idx + 1)]
    }
    return sorted
}
