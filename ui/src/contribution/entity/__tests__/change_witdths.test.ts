import { configureStore } from '@reduxjs/toolkit'
import { newRemote } from '../../../util/state'
import {
    ContributionEntityState,
    newContributionEntityState,
    newEntityWithDuplicates,
    newScoredEntity
} from '../state'
import {
    contributionEntitySlice,
    incrementSelectedEntityIdx,
    setColumnWidth,
    setSelectedEntityIdx
} from '../slice'

function setupStore({
    preloadedState = {
        contributionEntity: newContributionEntityState({})
    }
}: {
    preloadedState?: { contributionEntity: ContributionEntityState }
}) {
    const store = configureStore({
        reducer: {
            contributionEntity: contributionEntitySlice.reducer
        },
        preloadedState
    })
    return store
}

test('set width', () => {
    const store = setupStore({})
    store.dispatch(setColumnWidth({ idx: 1, width: 500 }))
    expect(store.getState().contributionEntity.matchWidths).toEqual([200, 500])
})
const idEntity0 = 'id-entity-0'
const displayTxt0 = 'display text 0'
const version0 = 100
const idEntity1 = 'id-entity-1'
const displayTxt1 = 'display text 1'
const version1 = 110
const testState = newContributionEntityState({
    entities: newRemote([
        newEntityWithDuplicates({
            idPersistent: idEntity0,
            displayTxt: displayTxt0,
            version: version0,
            similarEntities: newRemote([
                newScoredEntity({
                    idPersistent: 'id-match-0-0',
                    displayTxt: 'match 0 0',
                    displayTxtDetails: 'display text',
                    similarity: 0.1,
                    version: 101
                })
            ])
        }),
        newEntityWithDuplicates({
            idPersistent: idEntity1,
            displayTxt: displayTxt1,
            version: version1,
            similarEntities: newRemote([
                newScoredEntity({
                    idPersistent: 'id-match-1-0',
                    displayTxtDetails: 'display text',
                    displayTxt: 'match 1 0',
                    similarity: 0.2,
                    version: 110
                }),
                newScoredEntity({
                    idPersistent: 'id-match-1-1',
                    displayTxtDetails: 'display text',
                    displayTxt: 'match 1 1',
                    similarity: 0.3,
                    version: 111
                })
            ])
        })
    ])
})
test('extends number of width on direct selection', () => {
    const store = setupStore({
        preloadedState: {
            contributionEntity: testState
        }
    })
    expect(store.getState().contributionEntity.matchWidths).toEqual([200, 200])
    store.dispatch(setSelectedEntityIdx(0))
    expect(store.getState().contributionEntity.matchWidths).toEqual([200, 200, 200])
    store.dispatch(setSelectedEntityIdx(1))
    expect(store.getState().contributionEntity.matchWidths).toEqual([
        200, 200, 200, 200
    ])
})
test('does not reduce number of width on direct selection', () => {
    const store = setupStore({
        preloadedState: {
            contributionEntity: testState
        }
    })
    expect(store.getState().contributionEntity.matchWidths).toEqual([200, 200])
    store.dispatch(setSelectedEntityIdx(1))
    expect(store.getState().contributionEntity.matchWidths).toEqual([
        200, 200, 200, 200
    ])
    store.dispatch(setSelectedEntityIdx(0))
    expect(store.getState().contributionEntity.matchWidths).toEqual([
        200, 200, 200, 200
    ])
})

test('extends number of width on index increment', () => {
    const store = setupStore({
        preloadedState: {
            contributionEntity: { ...testState }
        }
    })
    store.dispatch(incrementSelectedEntityIdx())
    expect(store.getState().contributionEntity.matchWidths).toEqual([200, 200, 200])
    store.dispatch(incrementSelectedEntityIdx())
    expect(store.getState().contributionEntity.matchWidths).toEqual([
        200, 200, 200, 200
    ])
})
