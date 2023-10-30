import { GridCellKind } from '@glideapps/glide-data-grid'
import { TagType } from '../../../column_menu/state'
import { Remote } from '../../../util/state'
import { mkCellContentCallback } from '../hooks'
import { newEntityWithDuplicates, newScoredEntity } from '../state'
import { AssignType } from '../../../table/draw'

jest.mock('../../../util/state', () => {
    return { ...jest.requireActual('../../../util/state'), useThunkReducer: jest.fn() }
})
describe('cell contents callback', () => {
    const entityTest = newEntityWithDuplicates({
        idPersistent: 'id-test',
        displayTxt: 'group entity test',
        version: 0,
        cellContents: [
            new Remote([
                { value: 'value group', idPersistent: 'id-instance-test', version: 0 }
            ])
        ],
        similarEntities: new Remote([
            newScoredEntity({
                idPersistent: 'id-similar-test',
                displayTxt: 'similar entity test',
                version: 10,
                similarity: 0.9,
                cellContents: [
                    new Remote([
                        {
                            value: 'value similar',
                            idPersistent: 'id-instance-test',
                            version: 0
                        }
                    ])
                ]
            }),
            newScoredEntity({
                idPersistent: 'id-similar-test-1',
                displayTxt: 'similar entity test 1',
                version: 11,
                similarity: 0.8,
                cellContents: [
                    new Remote([
                        {
                            value: 'value similar 1',
                            idPersistent: 'id-instance-test',
                            version: 0
                        }
                    ])
                ]
            })
        ])
    })
    const columnTypes = [
        {
            id: 'Assignment',
            title: 'Assignment',
            width: 200,
            columnType: TagType.Inner
        },
        {
            columnType: TagType.String,
            width: 200,
            id: 'display-text-test',
            title: 'display text'
        },
        {
            columnType: TagType.String,
            width: 200,
            id: 'similarity-test',
            title: 'Similarity'
        },
        {
            columnType: TagType.String,
            width: 200,
            id: 'column-test',
            title: 'column test'
        }
    ]
    test('handles original entity', () => {
        const cellCallback = mkCellContentCallback(entityTest, columnTypes)
        expect(cellCallback([0, 0])).toEqual({
            kind: 'custom' as GridCellKind,
            data: new AssignType(false, true)
        })
        expect(cellCallback([1, 0])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'group entity test',
            data: 'group entity test',
            contentAlign: 'left',
            themeOverride: { baseFontStyle: 'bold 13px' }
        })
        expect(cellCallback([2, 0])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: '',
            data: '',
            contentAlign: 'right',
            themeOverride: { baseFontStyle: 'bold 13px' }
        })
        expect(cellCallback([3, 0])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'value group',
            data: 'value group',
            contentAlign: 'right',
            themeOverride: { baseFontStyle: 'bold 13px' }
        })
    })
    test('handles similar entities', () => {
        const cellCallback = mkCellContentCallback(entityTest, columnTypes)
        expect(cellCallback([0, 1])).toEqual({
            kind: 'custom' as GridCellKind,
            data: new AssignType(true, false)
        })
        expect(cellCallback([1, 1])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'similar entity test',
            data: 'similar entity test',
            contentAlign: 'left',
            themeOverride: undefined
        })
        expect(cellCallback([2, 1])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: '90 %',
            data: '90 %',
            contentAlign: 'right',
            themeOverride: undefined
        })
        expect(cellCallback([3, 1])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'value similar',
            data: 'value similar',
            contentAlign: 'right',
            themeOverride: undefined
        })
        expect(cellCallback([0, 2])).toEqual({
            kind: 'custom' as GridCellKind,
            data: new AssignType(true, false)
        })
        expect(cellCallback([1, 2])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'similar entity test 1',
            data: 'similar entity test 1',
            contentAlign: 'left',
            themeOverride: undefined
        })
        expect(cellCallback([2, 2])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: '80 %',
            data: '80 %',
            contentAlign: 'right',
            themeOverride: undefined
        })
        expect(cellCallback([3, 2])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'value similar 1',
            data: 'value similar 1',
            contentAlign: 'right',
            themeOverride: undefined
        })
    })
})
