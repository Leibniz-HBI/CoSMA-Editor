import { TagDefinition, TagType, newTagDefinition } from '../../column_menu/state'
import { newEntity } from '../state'
import { parseEntityObjectFromJson, parseValue } from '../thunks'

describe('parse Values', () => {
    test('parses valid float', () => {
        const parsedValue = parseValue(TagType.Float, '2.3')
        expect(parsedValue).toEqual(2.3)
    })
    test('NaN for invalid float', () => {
        const parsedValue = parseValue(TagType.Float, 'aa')
        expect(parsedValue).toBeNaN()
    })
    test('parses "True"', () => {
        const parsedValue = parseValue(TagType.Inner, 'True')
        expect(parsedValue).toBe(true)
    })
    test('parses "False"', () => {
        const parsedValue = parseValue(TagType.Inner, 'False')
        expect(parsedValue).toBe(false)
    })
    test('invalid boolean is false', () => {
        const parsedValue = parseValue(TagType.Inner, 'djdf')
        expect(parsedValue).toBe(false)
    })
    test('handles string', () => {
        const stringValue = 'test string'
        const parsedValue = parseValue(TagType.String, stringValue)
        expect(parsedValue).toEqual(stringValue)
    })
})

test('parses entity_with tag_definition details', () => {
    const idPersistent0 = 'test-id-0'
    const version0 = 0
    const displayTxt0 = 'test display txt 0'
    const tagDefName = 'Display Text'
    const idTagDefPersistent = 'display_txt_id'
    const test_entity_rsp_with_tag_def_details = {
        display_txt: displayTxt0,
        id_persistent: idPersistent0,
        display_txt_details: {
            id_persistent: idTagDefPersistent,
            name_path: [tagDefName],
            type: 'STRING',
            curated: true,
            version: 0,
            hidden: false
        },
        version: version0,
        disabled: false
    }
    const displayTextTagDef: TagDefinition = newTagDefinition({
        namePath: [tagDefName],
        idPersistent: idTagDefPersistent,
        columnType: TagType.String,
        curated: true,
        version: 0,
        hidden: false
    })
    const parsedValue = parseEntityObjectFromJson(test_entity_rsp_with_tag_def_details)
    expect(parsedValue).toEqual(
        newEntity({
            displayTxt: displayTxt0,
            idPersistent: idPersistent0,
            version: 0,
            disabled: false,

            displayTxtDetails: {
                ...displayTextTagDef,
                idParentPersistent: undefined,
                owner: undefined
            }
        })
    )
})
