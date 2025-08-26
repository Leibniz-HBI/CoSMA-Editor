import { GridCellKind } from '@glideapps/glide-data-grid'
import { ColumnType, newColumn } from '../../../column_menu/state'
import { newRemote } from '../../../util/state'
import { mkCellContentCallback } from '../hooks'
import { newEntityWithDuplicates, newScoredEntity } from '../state'
import { newReplaceButtonCellData } from '../../../table/draw'
import { vi } from 'vitest'

vi.mock('../../../util/state', async () => {
    return {
        ...(await vi.importActual('../../../util/state')),
        useThunkReducer: vi.fn()
    }
})
const idColumn = 'id-column-def-test'
describe('cell contents callback', () => {
    const entityTest = newEntityWithDuplicates({
        idPersistent: 'id-test',
        displayTxt: 'group entity test',
        version: 0,
        cellContents: [
            newRemote([
                { value: 'value group', idPersistent: 'id-instance-test', version: 0 }
            ])
        ],
        similarEntities: newRemote([
            newScoredEntity({
                idPersistent: 'id-similar-test',
                displayTxt: 'similar entity test',
                displayTxtDetails: 'display text',
                version: 10,
                similarity: 0.9,
                cellContents: [
                    newRemote([
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
                displayTxtDetails: 'display text',
                version: 11,
                idMatchColumnPersistentList: [idColumn],
                similarity: 0.8,
                cellContents: [
                    newRemote([
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
            columnType: ColumnType.String,
            width: 200,
            id: 'column-test',
            title: 'column test'
        }
    ]
    const column = newColumn({
        idPersistent: idColumn,
        namePath: ['some column'],
        curated: true,
        hidden: false,
        columnType: ColumnType.String,
        version: 15
    })
    test('handles column names', () => {
        const cellCallback = mkCellContentCallback(entityTest, columnTypes, 1, [])
        expect(cellCallback([0, 0])).toEqual({
            kind: 'custom' as GridCellKind,
            data: {
                isNew: false,
                isDiscard: true,
                active: false,
                kind: 'replace-button-cell'
            }
        })
        expect(cellCallback([0, 1])).toEqual({
            kind: 'text' as GridCellKind,
            data: 'Display Text Similarity',
            displayData: 'Display Text Similarity',
            contentAlign: 'left',
            allowOverlay: false,
            style: 'normal',
            themeOverride: {}
        })
        expect(cellCallback([0, 2])).toEqual({
            kind: 'text' as GridCellKind,
            data: 'Match Count',
            displayData: 'Match Count',
            contentAlign: 'left',
            allowOverlay: false,
            style: 'normal',
            themeOverride: {}
        })
        expect(cellCallback([0, 3])).toEqual({
            kind: 'text' as GridCellKind,
            data: 'Display Text',
            displayData: 'Display Text',
            contentAlign: 'left',
            allowOverlay: false,
            style: 'normal',
            themeOverride: {}
        })
        expect(cellCallback([0, 4])).toEqual({
            kind: 'text' as GridCellKind,
            data: '4',
            displayData: 'column test',
            contentAlign: 'left',
            allowOverlay: false
        })
    })
    test('handles original entity', () => {
        const cellCallback = mkCellContentCallback(entityTest, columnTypes, 1, [])
        expect(cellCallback([1, 0])).toEqual({
            kind: 'custom' as GridCellKind,
            data: newReplaceButtonCellData(true, true, false)
        })

        expect(cellCallback([1, 1])).toEqual({
            kind: 'text' as GridCellKind,
            data: '',
            displayData: '',
            contentAlign: 'center',
            allowOverlay: false,
            style: 'faded',
            themeOverride: {}
        })
        expect(cellCallback([1, 2])).toEqual({
            kind: 'text' as GridCellKind,
            data: '',
            displayData: '',
            contentAlign: 'center',
            allowOverlay: false,
            style: 'faded',
            themeOverride: {}
        })

        expect(cellCallback([1, 3])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'group entity test',
            data: 'group entity test',
            contentAlign: 'right',
            style: 'normal',
            themeOverride: {}
        })
        expect(cellCallback([1, 4])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'value group',
            data: 'value group',
            contentAlign: 'right',
            themeOverride: {}
        })
    })
    test('handles similar entities', () => {
        const cellCallback = mkCellContentCallback(entityTest, columnTypes, 1, [column])
        expect(cellCallback([2, 0])).toEqual({
            kind: 'custom' as GridCellKind,
            data: newReplaceButtonCellData(false, false, false)
        })
        expect(cellCallback([2, 1])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: '90 %',
            data: '90 %',
            contentAlign: 'right',
            style: 'normal',
            themeOverride: {}
        })
        expect(cellCallback([2, 2])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: '0/1',
            data: '0/1',
            contentAlign: 'right',
            style: 'normal',
            themeOverride: {}
        })
        expect(cellCallback([2, 3])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'similar entity test',
            data: 'similar entity test',
            contentAlign: 'right',
            style: 'normal',
            themeOverride: {}
        })
        expect(cellCallback([2, 4])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'value similar',
            data: 'value similar',
            contentAlign: 'right',
            themeOverride: {}
        })
        expect(cellCallback([3, 0])).toEqual({
            kind: 'custom' as GridCellKind,
            data: newReplaceButtonCellData(false, false, false)
        })
        expect(cellCallback([3, 1])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: '80 %',
            data: '80 %',
            contentAlign: 'right',
            style: 'normal',
            themeOverride: {}
        })
        expect(cellCallback([3, 2])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: '1/1',
            data: '1/1',
            contentAlign: 'right',
            style: 'normal',
            themeOverride: {}
        })
        expect(cellCallback([3, 3])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'similar entity test 1',
            data: 'similar entity test 1',
            contentAlign: 'right',
            style: 'normal',
            themeOverride: {}
        })
        expect(cellCallback([3, 4])).toEqual({
            kind: 'text' as GridCellKind,
            allowOverlay: false,
            displayData: 'value similar 1',
            data: 'value similar 1',
            contentAlign: 'right',
            themeOverride: { baseFontStyle: '600 13px', bgCell: '#d1e3e3' }
        })
    })
})
