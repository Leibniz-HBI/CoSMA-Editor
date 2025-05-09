import { Column, ColumnType, newColumn } from '../../column_menu/state'
import { newEntity } from '../../entity/state'
import { parseEntityObjectFromJson, parseValue } from '../thunks'

describe('parse Values', () => {
    test('parses valid float', () => {
        const parsedValue = parseValue(ColumnType.Float, '2.3')
        expect(parsedValue).toEqual(2.3)
    })
    test('NaN for invalid float', () => {
        const parsedValue = parseValue(ColumnType.Float, 'aa')
        expect(parsedValue).toBeNaN()
    })
    test('parses "True"', () => {
        const parsedValue = parseValue(ColumnType.Inner, 'True')
        expect(parsedValue).toBe(true)
    })
    test('parses "False"', () => {
        const parsedValue = parseValue(ColumnType.Inner, 'False')
        expect(parsedValue).toBe(false)
    })
    test('invalid boolean is false', () => {
        const parsedValue = parseValue(ColumnType.Inner, 'djdf')
        expect(parsedValue).toBe(false)
    })
    test('handles string', () => {
        const stringValue = 'test string'
        const parsedValue = parseValue(ColumnType.String, stringValue)
        expect(parsedValue).toEqual(stringValue)
    })
})

test('parses entity_with column details', () => {
    const idPersistent0 = 'test-id-0'
    const version0 = 0
    const displayTxt0 = 'test display txt 0'
    const columnName = 'Display Text'
    const idColumnPersistent = 'display_txt_id'
    const test_entity_rsp_with_column_details = {
        display_txt: displayTxt0,
        id_persistent: idPersistent0,
        display_txt_details: {
            id_persistent: idColumnPersistent,
            name_path: [columnName],
            type: 'STRING',
            curated: true,
            version: 0,
            hidden: false
        },
        version: version0,
        disabled: false
    }
    const displayTextColumn: Column = newColumn({
        namePath: [columnName],
        idPersistent: idColumnPersistent,
        columnType: ColumnType.String,
        curated: true,
        version: 0,
        hidden: false
    })
    const parsedValue = parseEntityObjectFromJson(test_entity_rsp_with_column_details)
    expect(parsedValue).toEqual(
        newEntity({
            displayTxt: displayTxt0,
            idPersistent: idPersistent0,
            version: 0,
            disabled: false,

            displayTxtDetails: {
                ...displayTextColumn,
                idParentPersistent: undefined,
                owner: undefined
            }
        })
    )
})
