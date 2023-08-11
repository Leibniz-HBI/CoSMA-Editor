import { ColumnType } from '../../column_menu/state'
import { ColumnState, TableState } from '../state'

describe('csv iterator', () => {
    test('empty state', () => {
        const state = new TableState({})
        const csvLines = state.csvLines()
        expect(csvLines).toEqual([])
    })
    const idEntity = 'id-entity-test'
    const idEntity1 = 'id-entity-test1'
    const idEntity2 = 'id-entity-test2'
    const idEntity3 = 'id-entity-test3'
    const nameEntity = 'name entity'
    const nameEntity1 = 'name entity 1'
    const nameEntity2 = 'name entity 2'
    const nameEntity3 = 'name entity 3'
    const entities = [idEntity, idEntity1, idEntity2, idEntity3]
    const displayTextCol = new ColumnState({
        name: 'Display Text',
        cellContents: [
            [{ value: nameEntity, idPersistent: 'id-value00', version: 0 }],
            [{ value: nameEntity1, idPersistent: 'id-value01', version: 1 }],
            [{ value: nameEntity2, idPersistent: 'id-value02', version: 11 }],
            [{ value: nameEntity3, idPersistent: 'id-value03', version: 111 }]
        ],
        idPersistent: 'id-column-display-text-test',
        columnType: ColumnType.String
    })
    test('entities only', () => {
        const state = new TableState({
            entities: entities,
            columnStates: [displayTextCol]
        })
        const csvLines = state.csvLines()
        expect(csvLines).toEqual([
            '"id_entity_persistent","display_txt"\n',
            `"${idEntity}","${nameEntity}"\n`,
            `"${idEntity1}","${nameEntity1}"\n`,
            `"${idEntity2}","${nameEntity2}"\n`,
            `"${idEntity3}","${nameEntity3}"\n`
        ])
    })
    test('with additional column', () => {
        const colValue = 'value test'
        const colValue1 = 'value test 1'
        const colValue2 = 'value test 2'
        const colValue3 = 'value test 3'
        const idCol = 'id-col-test'
        const nameCol = 'column test'
        const otherCol = new ColumnState({
            name: nameCol,
            idPersistent: idCol,
            cellContents: [
                [{ value: colValue, idPersistent: 'id-value10', version: 0 }],
                [{ value: colValue1, idPersistent: 'id-value11', version: 2 }],
                [{ value: colValue2, idPersistent: 'id-value12', version: 22 }],
                [{ value: colValue3, idPersistent: 'id-value13', version: 222 }]
            ],
            columnType: ColumnType.String
        })
        const state = new TableState({
            entities: entities,
            columnStates: [displayTextCol, otherCol]
        })
        const csvLines = state.csvLines()
        expect(csvLines).toEqual([
            `"id_entity_persistent","display_txt","${nameCol}"\n`,
            `"${idEntity}","${nameEntity}","${colValue}"\n`,
            `"${idEntity1}","${nameEntity1}","${colValue1}"\n`,
            `"${idEntity2}","${nameEntity2}","${colValue2}"\n`,
            `"${idEntity3}","${nameEntity3}","${colValue3}"\n`
        ])
    })
})
