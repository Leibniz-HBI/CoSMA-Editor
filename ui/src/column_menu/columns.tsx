import { ColumnDefinition, ColumnType } from './state'
export const all_columns = {
    Kategorie: new ColumnDefinition({
        idPersistent: 'd342c412-3c96-49d3-bddd-53da8ed20ce6',
        version: 1,
        columnType: ColumnType.String,
        namePath: ['Parliament']
    }),
    Partei: new ColumnDefinition({
        idPersistent: 'e593654d-23f7-48a4-af56-4d6687deb6b8',
        version: 2,
        columnType: ColumnType.String,
        namePath: ['Party']
    }),
    SM_Facebook_user: new ColumnDefinition({
        idPersistent: '47222c6d-ba5b-4c92-a8c2-1a80e1173af3',
        idParentPersistent: '7f39cc52-2296-4936-85a1-622f4126b978',
        version: 5,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Facebook', 'user']
    }),
    SM_Facebook_id: new ColumnDefinition({
        idPersistent: '475fceaa-9321-41ae-ae51-77611ab8af23',
        idParentPersistent: '7f39cc52-2296-4936-85a1-622f4126b978',
        version: 6,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Facebook', 'id']
    }),
    SM_Facebook_verifiziert: new ColumnDefinition({
        idPersistent: '92ff64fb-bb04-45e6-95d3-e0e9d4faa629',
        idParentPersistent: '7f39cc52-2296-4936-85a1-622f4126b978',
        version: 7,
        columnType: ColumnType.Inner,
        namePath: ['Social Media', 'Facebook', 'verified']
    }),
    SM_Twitter_user: new ColumnDefinition({
        idPersistent: 'e11a0dc5-5903-4860-a055-45c70b1a5569',
        idParentPersistent: '391f1d05-287f-4871-aa18-309a633ad453',
        version: 9,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Twitter', 'user']
    }),
    SM_Twitter_id: new ColumnDefinition({
        idPersistent: '01233d42-e28d-4678-8417-8246777bceaa',
        idParentPersistent: '391f1d05-287f-4871-aa18-309a633ad453',
        version: 10,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Twitter', 'id']
    }),
    SM_Twitter_verifiziert: new ColumnDefinition({
        idPersistent: '3fa790ae-f585-4abc-b87a-e8210b800e4f',
        idParentPersistent: '391f1d05-287f-4871-aa18-309a633ad453',
        version: 11,
        columnType: ColumnType.Inner,
        namePath: ['Social Media', 'Twitter', 'verified']
    }),
    SM_Telegram_user: new ColumnDefinition({
        idPersistent: '2ee2de25-f956-4a8c-8f29-bdb67c217625',
        idParentPersistent: '7d7cc609-538b-4c0c-a4dd-da0c77c7c43e',
        version: 13,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Telegram', 'user']
    }),
    SM_Telegram_id: new ColumnDefinition({
        idPersistent: 'fbccfb1c-4b10-40f8-9bf2-ef8bd57bd71a',
        idParentPersistent: '7d7cc609-538b-4c0c-a4dd-da0c77c7c43e',
        version: 14,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Telegram', 'id']
    }),
    SM_Telegram_verifiziert: new ColumnDefinition({
        idPersistent: '1ad57d41-9da6-4209-a7c4-25cae53d2ffe',
        idParentPersistent: '7d7cc609-538b-4c0c-a4dd-da0c77c7c43e',
        version: 15,
        columnType: ColumnType.Inner,
        namePath: ['Social Media', 'Telegram', 'verified']
    }),
    SM_Youtube_user: new ColumnDefinition({
        idPersistent: 'ed4f8d31-90ac-439a-a628-bddb7c1cabcb',
        idParentPersistent: 'fb6d9891-58a3-4557-9d94-3b2c30f2a7e9',
        version: 17,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'YouTube', 'user']
    }),
    SM_Youtube_id: new ColumnDefinition({
        idPersistent: 'effaafe2-321e-4a9e-9dfc-717c17995f7f',
        idParentPersistent: 'fb6d9891-58a3-4557-9d94-3b2c30f2a7e9',
        version: 18,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'YouTube', 'id']
    }),
    SM_Youtube_verifiziert: new ColumnDefinition({
        idPersistent: '709b96e6-a832-4b44-a045-15b9c478e9ac',
        idParentPersistent: 'fb6d9891-58a3-4557-9d94-3b2c30f2a7e9',
        version: 19,
        columnType: ColumnType.Inner,
        namePath: ['Social Media', 'YouTube', 'verified']
    }),
    SM_Instagram_user: new ColumnDefinition({
        idPersistent: '2fc73117-dec2-4317-a2f1-105b7a1e921d',
        idParentPersistent: 'bf059550-41ef-405c-adf4-226ff35e3482',
        version: 21,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Instagram', 'user']
    }),
    SM_Instagram_id: new ColumnDefinition({
        idPersistent: '5f5988bc-2797-4b0a-8e9f-db839f1159b6',
        idParentPersistent: 'bf059550-41ef-405c-adf4-226ff35e3482',
        version: 22,
        columnType: ColumnType.String,
        namePath: ['Social Media', 'Instagram', 'id']
    }),
    SM_Instagram_verifiziert: new ColumnDefinition({
        idPersistent: '53346e07-4df4-4ebe-9d73-8522edb527d2',
        idParentPersistent: 'bf059550-41ef-405c-adf4-226ff35e3482',
        version: 23,
        columnType: ColumnType.Inner,
        namePath: ['Social Media', 'Instagram', 'verified']
    })
}
